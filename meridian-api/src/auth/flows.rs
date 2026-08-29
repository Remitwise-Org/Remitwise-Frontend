//! Sign-in, logout, and verification flows.
//!
//! Each flow is **idempotent** where possible and guarantees that failed
//! or repeated operations leave no unauthorized or partial state.
//!
//! # Multi-tab / multi-device safety
//!
//! - A new login creates a fresh session with its own token pair.
//! - Older sessions for the same user remain valid until explicitly
//!   logged out or superseded.
//! - Logout revokes *all* tokens for a user, terminating every session
//!   (including other tabs / devices).
//! - Verification is stateless — it only checks the current access
//!   token.
//!
//! # Amount precision in flows
//!
//! Balance snapshots (e.g. in login response) are validated through
//! [`crate::amount::Amount`] before inclusion.  If the balance is
//! outside the valid range the login fails cleanly — it never
//! rounds, truncates, or silently clamps.

use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::amount::Amount;

use super::errors::AuthError;
use super::tokens::{AccessToken, RefreshToken, TokenPair, TokenStore};

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/// A user session tracking its creation, last activity, and whether
/// it has been superseded.
#[derive(Debug, Clone, PartialEq)]
pub struct Session {
    pub id: u64,
    pub subject: String,
    pub created_at: u64,
    pub last_activity_at: u64,
    /// The token pair governing this session.
    pub tokens: TokenPair,
    /// If this session was superseded by a newer one, this is set.
    pub superseded: bool,
}

// ---------------------------------------------------------------------------
// Login result
// ---------------------------------------------------------------------------

/// Returned after a successful login.
#[derive(Debug, Clone, PartialEq)]
pub struct LoginResult {
    pub session: Session,
    pub tokens: TokenPair,
    /// Balance snapshot in stroops — guaranteed to be a valid [`Amount`].
    /// `None` if balance is not yet available.
    pub balance: Option<Amount>,
}

// ---------------------------------------------------------------------------
// Verifier — stateless token verification
// ---------------------------------------------------------------------------

/// Stateless token verifier.  Checks validity, expiry, and revocation
/// against the store.
pub struct Verifier<'a> {
    store: &'a TokenStore,
}

impl<'a> Verifier<'a> {
    pub fn new(store: &'a TokenStore) -> Self {
        Self { store }
    }

    /// Verify an access token.  Returns the verified token on success.
    pub fn verify(&self, token: &AccessToken) -> Result<AccessToken, AuthError> {
        self.store.verify_access(token)
    }
}

// ---------------------------------------------------------------------------
// Auth service
// ---------------------------------------------------------------------------

/// In-memory auth service.  Production implementations would use a
/// persistent store.
pub struct AuthService {
    store: TokenStore,
    /// Active sessions keyed by session id.
    sessions: HashMap<u64, Session>,
    /// Monotonic session id counter.
    next_session_id: u64,
    /// Maximum login attempts before lockout.
    max_login_attempts: u32,
    /// Lockout duration.
    lockout_duration: Duration,
    /// Per-subject attempt tracking: (subject, attempts, locked_until).
    attempts: HashMap<String, (u32, Option<u64>)>,
}

impl AuthService {
    pub fn new() -> Self {
        Self {
            store: TokenStore::new(),
            sessions: HashMap::new(),
            next_session_id: 1,
            max_login_attempts: 5,
            lockout_duration: Duration::from_secs(300),
            attempts: HashMap::new(),
        }
    }

    pub fn with_lifetimes(access: Duration, refresh: Duration) -> Self {
        Self {
            store: TokenStore::with_lifetimes(access, refresh),
            sessions: HashMap::new(),
            next_session_id: 1,
            max_login_attempts: 5,
            lockout_duration: Duration::from_secs(300),
            attempts: HashMap::new(),
        }
    }

    fn now_secs() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_secs()
    }

    // -- Login -------------------------------------------------------------

    /// Authenticate a user.  On success returns a [`LoginResult`] with
    /// validated balance (if provided).
    ///
    /// # Multi-device
    ///
    /// Each call creates an independent session — concurrent logins from
    /// different devices are allowed.  Use [`logout_all`] to terminate
    /// all sessions.
    pub fn login(
        &mut self,
        subject: String,
        password: &str,
        balance_stroops: Option<u64>,
    ) -> Result<LoginResult, AuthError> {
        // -- Amount validation first (before any state change) -----
        let balance = if let Some(stroops) = balance_stroops {
            Some(
                Amount::new(stroops)
                    .map_err(|e| AuthError::AmountValidationFailed(e.to_string()))?,
            )
        } else {
            None
        };

        // -- Rate limiting / lockout check -------------------------
        let now = Self::now_secs();
        if let Some((count, locked_until)) = self.attempts.get(&subject) {
            if let Some(until) = locked_until {
                if now < *until {
                    return Err(AuthError::AccountLocked {
                        retry_after_secs: until - now,
                    });
                }
                // Lockout expired — reset counter.
                self.attempts.insert(subject.clone(), (0, None));
            } else if *count >= self.max_login_attempts {
                let locked_until = now.saturating_add(self.lockout_duration.as_secs());
                self.attempts
                    .insert(subject.clone(), (*count, Some(locked_until)));
                return Err(AuthError::AccountLocked {
                    retry_after_secs: self.lockout_duration.as_secs(),
                });
            }
        }

        // -- Credential check -------------------------------------------
        // Simplified: real impl would hash and compare.
        if password.is_empty() {
            self.record_failure(&subject);
            return Err(AuthError::InvalidCredentials);
        }

        // -- Success: reset attempts ------------------------------------
        self.attempts.insert(subject.clone(), (0, None));

        // -- Issue tokens -----------------------------------------------
        let tokens = self.store.issue_pair(subject.clone());

        // -- Create session ---------------------------------------------
        let session_id = self.next_session_id;
        self.next_session_id = self
            .next_session_id
            .checked_add(1)
            .expect("session id overflow");

        let session = Session {
            id: session_id,
            subject: subject.clone(),
            created_at: now,
            last_activity_at: now,
            tokens: tokens.clone(),
            superseded: false,
        };

        self.sessions.insert(session_id, session.clone());

        Ok(LoginResult {
            session,
            tokens,
            balance,
        })
    }

    fn record_failure(&mut self, subject: &str) {
        let entry = self
            .attempts
            .entry(subject.to_string())
            .or_insert((0, None));
        entry.0 = entry.0.saturating_add(1);
    }

    // -- Logout ------------------------------------------------------------

    /// Log out a single session.  Revokes the tokens for that session.
    ///
    /// # Atomic rollback
    ///
    /// Token revocation and session supersession are applied together.
    /// A failure in either step rolls back the other, so callers never
    /// observe a partially-logged-out session.
    pub fn logout(&mut self, session_id: u64) -> Result<(), AuthError> {
        let session = self
            .sessions
            .get(&session_id)
            .ok_or(AuthError::SessionNotFound)?;

        // Snapshot both stores so we can roll back on failure.
        let token_snapshot = self.store.snapshot();
        let session_superseded = self
            .sessions
            .get(&session_id)
            .map(|s| s.superseded);

        self.store.revoke(session.tokens.access.id);
        self.store.revoke(session.tokens.refresh.id);

        if let Some(s) = self.sessions.get_mut(&session_id) {
            s.superseded = true;
        }

        // Validate that revocation succeeded — if not, roll back.
        if !self.store.is_revoked(session.tokens.access.id)
            || !self.store.is_revoked(session.tokens.refresh.id)
        {
            self.store.restore(token_snapshot);
            if let Some(superseded) = session_superseded {
                if let Some(s) = self.sessions.get_mut(&session_id) {
                    s.superseded = superseded;
                }
            }
            return Err(AuthError::InternalError(
                "logout partial failure, rolled back".into(),
            ));
        }

        Ok(())
    }

    /// Log out all sessions for a subject (e.g. "log out everywhere").
    ///
    /// # Atomic rollback
    ///
    /// All token revocations and session supersessions are collected,
    /// then applied.  If any step fails, every applied change is
    /// rolled back so no session is left in a half-logged-out state.
    pub fn logout_all(&mut self, subject: &str) -> Result<u32, AuthError> {
        let ids: Vec<u64> = self
            .sessions
            .values()
            .filter(|s| s.subject == subject && !s.superseded)
            .map(|s| s.id)
            .collect();

        let count = ids.len() as u32;

        // Snapshot before making any changes.
        let token_snapshot = self.store.snapshot();
        let session_snapshots: Vec<(u64, bool)> = ids
            .iter()
            .map(|&id| {
                let superseded = self.sessions.get(&id).map(|s| s.superseded).unwrap_or(false);
                (id, superseded)
            })
            .collect();

        for id in &ids {
            if let Some(session) = self.sessions.get(id) {
                self.store.revoke(session.tokens.access.id);
                self.store.revoke(session.tokens.refresh.id);
            }
            if let Some(s) = self.sessions.get_mut(id) {
                s.superseded = true;
            }
        }

        self.store.revoke_all_for_subject(subject);

        // Validate that all revocations succeeded.
        for id in &ids {
            if let Some(session) = self.sessions.get(id) {
                if !self.store.is_revoked(session.tokens.access.id)
                    || !self.store.is_revoked(session.tokens.refresh.id)
                {
                    // Roll back everything.
                    self.store.restore(token_snapshot);
                    for (sid, superseded) in &session_snapshots {
                        if let Some(s) = self.sessions.get_mut(sid) {
                            s.superseded = *superseded;
                        }
                    }
                    return Err(AuthError::InternalError(
                        "logout_all partial failure, rolled back".into(),
                    ));
                }
            }
        }

        Ok(count)
    }

    // -- Verification (stateless) -----------------------------------------

    /// Verify an access token and return the subject if valid.
    pub fn verify_token(&self, token: &AccessToken) -> Result<String, AuthError> {
        let verified = self.store.verify_access(token)?;
        Ok(verified.subject)
    }

    // -- Refresh (via token store) ----------------------------------------

    /// Refresh a session's tokens.
    ///
    /// # Atomic rollback
    ///
    /// After a successful token rotation the session record is updated
    /// to hold the new token pair.  If the session update fails after
    /// token rotation, the token store is rolled back to its pre-refresh
    /// snapshot so the old tokens remain valid.
    pub fn refresh_session(
        &mut self,
        refresh_token: &RefreshToken,
    ) -> Result<TokenPair, AuthError> {
        // Snapshot the token store before rotation.
        let token_snapshot = self.store.snapshot();
        let session_snapshots: Vec<(u64, TokenPair)> = self
            .sessions
            .values()
            .filter(|s| s.subject == refresh_token.subject && !s.superseded)
            .map(|s| (s.id, s.tokens.clone()))
            .collect();

        let new_pair = self.store.refresh(refresh_token)?;

        // Update session records to hold the new tokens.
        let mut updated_any = false;
        for (session_id, _) in &session_snapshots {
            if let Some(session) = self.sessions.get_mut(session_id) {
                session.tokens = new_pair.clone();
                session.last_activity_at = Self::now_secs();
                updated_any = true;
            }
        }

        // If the session update failed to apply to any session, roll back
        // the token store so old tokens remain usable.
        if !updated_any && !session_snapshots.is_empty() {
            self.store.restore(token_snapshot);
            for (session_id, old_tokens) in &session_snapshots {
                if let Some(session) = self.sessions.get_mut(session_id) {
                    session.tokens = old_tokens.clone();
                }
            }
            return Err(AuthError::InternalError(
                "refresh session update failed, rolled back".into(),
            ));
        }

        Ok(new_pair)
    }

    // -- Accessors --------------------------------------------------------

    pub fn store(&self) -> &TokenStore {
        &self.store
    }

    pub fn session_count(&self) -> usize {
        self.sessions.len()
    }
}

impl Default for AuthService {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::amount::Amount;

    fn setup() -> AuthService {
        AuthService::new()
    }

    // -- Login tests -------------------------------------------------------

    #[test]
    fn login_success() {
        let mut auth = setup();
        let result = auth.login("alice".into(), "password123", None);
        assert!(result.is_ok());
        let lr = result.unwrap();
        assert_eq!(lr.session.subject, "alice");
        assert!(lr.balance.is_none());
    }

    #[test]
    fn login_with_valid_balance() {
        let mut auth = setup();
        let result = auth.login("alice".into(), "password123", Some(1_000_000_000));
        assert!(result.is_ok());
        let lr = result.unwrap();
        assert_eq!(lr.balance, Some(Amount::new(1_000_000_000).unwrap()));
    }

    #[test]
    fn login_rejects_zero_balance() {
        let mut auth = setup();
        let result = auth.login("alice".into(), "password123", Some(0));
        assert!(result.is_err());
        match result.unwrap_err() {
            AuthError::AmountValidationFailed(_) => {}
            other => panic!("expected AmountValidationFailed, got {other:?}"),
        }
    }

    #[test]
    fn login_rejects_overflow_balance() {
        let mut auth = setup();
        let result = auth.login(
            "alice".into(),
            "password123",
            Some(crate::amount::MAX_STROOPS + 1),
        );
        assert!(result.is_err());
        match result.unwrap_err() {
            AuthError::AmountValidationFailed(_) => {}
            other => panic!("expected AmountValidationFailed, got {other:?}"),
        }
    }

    #[test]
    fn login_empty_password_fails() {
        let mut auth = setup();
        let result = auth.login("alice".into(), "", None);
        assert_eq!(result, Err(AuthError::InvalidCredentials));
    }

    #[test]
    fn login_lockout_after_max_attempts() {
        let mut auth = setup();
        for _ in 0..5 {
            let _ = auth.login("alice".into(), "", None); // empty = wrong
        }
        // Next attempt should be locked.
        let result = auth.login("alice".into(), "", None);
        assert!(matches!(result, Err(AuthError::AccountLocked { .. })));
    }

    #[test]
    fn login_success_resets_attempt_counter() {
        let mut auth = setup();
        let _ = auth.login("alice".into(), "", None); // 1 failure
        let _ = auth.login("alice".into(), "", None); // 2 failures
        let _ = auth.login("alice".into(), "password", None); // success
                                                              // Should not be locked.
        let result = auth.login("alice".into(), "", None);
        assert_eq!(result, Err(AuthError::InvalidCredentials)); // not locked
    }

    // -- Logout tests ------------------------------------------------------

    #[test]
    fn logout_revokes_tokens() {
        let mut auth = setup();
        let lr = auth.login("alice".into(), "password", None).unwrap();
        let session_id = lr.session.id;

        auth.logout(session_id).unwrap();

        assert!(auth.store().is_revoked(lr.tokens.access.id));
        assert!(auth.store().is_revoked(lr.tokens.refresh.id));
    }

    #[test]
    fn logout_nonexistent_session_fails() {
        let mut auth = setup();
        assert_eq!(auth.logout(999), Err(AuthError::SessionNotFound));
    }

    #[test]
    fn logout_all_terminates_every_session() {
        let mut auth = setup();
        let lr1 = auth.login("alice".into(), "password", None).unwrap();
        let lr2 = auth.login("alice".into(), "password", None).unwrap();

        let count = auth.logout_all("alice").unwrap();
        assert_eq!(count, 2);

        assert!(auth.store().is_revoked(lr1.tokens.access.id));
        assert!(auth.store().is_revoked(lr2.tokens.access.id));
    }

    // -- Verification tests ------------------------------------------------

    #[test]
    fn verify_valid_token_returns_subject() {
        let mut auth = setup();
        let lr = auth.login("alice".into(), "password", None).unwrap();
        let subject = auth.verify_token(&lr.tokens.access).unwrap();
        assert_eq!(subject, "alice");
    }

    #[test]
    fn verify_revoked_token_fails() {
        let mut auth = setup();
        let lr = auth.login("alice".into(), "password", None).unwrap();
        auth.logout(lr.session.id).unwrap();
        assert_eq!(
            auth.verify_token(&lr.tokens.access),
            Err(AuthError::TokenRevoked)
        );
    }

    // -- Multi-device tests ------------------------------------------------

    #[test]
    fn concurrent_logins_create_separate_sessions() {
        let mut auth = setup();
        let lr1 = auth.login("alice".into(), "password", None).unwrap();
        let lr2 = auth.login("alice".into(), "password", None).unwrap();

        assert_ne!(lr1.session.id, lr2.session.id);
        assert_ne!(lr1.tokens.access.id, lr2.tokens.access.id);
        assert_eq!(auth.session_count(), 2);
    }

    #[test]
    fn logout_one_session_does_not_affect_other() {
        let mut auth = setup();
        let lr1 = auth.login("alice".into(), "password", None).unwrap();
        let lr2 = auth.login("alice".into(), "password", None).unwrap();

        auth.logout(lr1.session.id).unwrap();

        // Second session's tokens should still be valid.
        assert!(auth.verify_token(&lr2.tokens.access).is_ok());
    }

    // -- Refresh flow tests ------------------------------------------------

    #[test]
    fn refresh_creates_new_valid_tokens() {
        let mut auth = setup();
        let lr = auth.login("alice".into(), "password", None).unwrap();
        let new_pair = auth.refresh_session(&lr.tokens.refresh).unwrap();

        // New tokens are valid.
        assert!(auth.verify_token(&new_pair.access).is_ok());
    }

    #[test]
    fn refresh_replay_kills_session() {
        let mut auth = setup();
        let lr = auth.login("alice".into(), "password", None).unwrap();
        let _ = auth.refresh_session(&lr.tokens.refresh).unwrap();

        // Replay old refresh token.
        let result = auth.refresh_session(&lr.tokens.refresh);
        assert_eq!(result, Err(AuthError::TokenAlreadyUsed));
    }

    // -- Atomic rollback regression tests ---------------------------------

    #[test]
    fn refresh_updates_session_tokens() {
        let mut auth = setup();
        let lr = auth.login("alice".into(), "password", None).unwrap();
        let session_id = lr.session.id;

        let new_pair = auth.refresh_session(&lr.tokens.refresh).unwrap();

        // The session should now hold the new tokens.
        let session = auth.sessions.get(&session_id).unwrap();
        assert_eq!(session.tokens.access.id, new_pair.access.id);
        assert_eq!(session.tokens.refresh.id, new_pair.refresh.id);
    }

    #[test]
    fn refresh_old_access_token_invalidated() {
        let mut auth = setup();
        let lr = auth.login("alice".into(), "password", None).unwrap();
        let old_access = lr.tokens.access.clone();

        let _ = auth.refresh_session(&lr.tokens.refresh).unwrap();

        // Old access token should be revoked.
        assert!(auth.store().is_revoked(old_access.id));
    }

    #[test]
    fn refresh_new_access_token_valid() {
        let mut auth = setup();
        let lr = auth.login("alice".into(), "password", None).unwrap();

        let new_pair = auth.refresh_session(&lr.tokens.refresh).unwrap();

        // New access token should be valid.
        let subject = auth.verify_token(&new_pair.access).unwrap();
        assert_eq!(subject, "alice");
    }

    #[test]
    fn logout_revokes_tokens_and_supersedes_session() {
        let mut auth = setup();
        let lr = auth.login("alice".into(), "password", None).unwrap();
        let session_id = lr.session.id;

        auth.logout(session_id).unwrap();

        // Tokens are revoked.
        assert!(auth.store().is_revoked(lr.tokens.access.id));
        assert!(auth.store().is_revoked(lr.tokens.refresh.id));
        // Session is superseded.
        assert!(auth.sessions.get(&session_id).unwrap().superseded);
    }

    #[test]
    fn logout_all_supersedes_all_sessions() {
        let mut auth = setup();
        let lr1 = auth.login("alice".into(), "password", None).unwrap();
        let lr2 = auth.login("alice".into(), "password", None).unwrap();

        let count = auth.logout_all("alice").unwrap();
        assert_eq!(count, 2);

        assert!(auth.sessions.get(&lr1.session.id).unwrap().superseded);
        assert!(auth.sessions.get(&lr2.session.id).unwrap().superseded);
        assert!(auth.store().is_revoked(lr1.tokens.access.id));
        assert!(auth.store().is_revoked(lr2.tokens.access.id));
    }

    #[test]
    fn login_failure_leaves_no_partial_state() {
        let mut auth = setup();
        let session_count_before = auth.session_count();
        let token_count_before = auth.store().active_access_count();

        // Failed login (empty password).
        let _ = auth.login("alice".into(), "", None);

        // No new sessions or tokens should exist.
        assert_eq!(auth.session_count(), session_count_before);
        assert_eq!(auth.store().active_access_count(), token_count_before);
    }

    #[test]
    fn login_lockout_leaves_no_partial_state() {
        let mut auth = setup();
        let session_count_before = auth.session_count();

        for _ in 0..5 {
            let _ = auth.login("alice".into(), "", None);
        }
        let result = auth.login("alice".into(), "", None);
        assert!(matches!(result, Err(AuthError::AccountLocked { .. })));

        // No sessions created.
        assert_eq!(auth.session_count(), session_count_before);
    }
}
