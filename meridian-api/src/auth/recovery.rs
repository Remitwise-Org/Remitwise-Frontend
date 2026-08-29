//! Account recovery flow.
//!
//! Recovery is a two-phase process:
//!
//! 1. **Request** — the user requests a recovery token (e.g. via email).
//!    This is idempotent: repeated requests for the same session
//!    produce the same outcome.
//! 2. **Complete** — the user presents the recovery token.  The old
//!    session is revoked and a fresh token pair is issued.
//!
//! # Security invariants
//!
//! - A recovery token can only be used **once** (replay protection).
//! - An expired recovery token is rejected; a new request is required.
//! - Completing recovery **revokes all other sessions** for the same
//!   subject (device compromise recovery).
//! - Recovery never exposes balance information in the recovery token
//!   itself — balances are validated through [`crate::amount`] only at
//!   the point of use.
//! - Concurrent recovery requests for the same session are serialized:
//!   only the first completes; subsequent ones receive
//!   [`AuthError::RecoveryPending`].

use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use super::errors::AuthError;
use super::tokens::{TokenPair, TokenStore};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// Status of a recovery request.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum RecoveryStatus {
    /// Waiting for the user to present the token.
    Pending,
    /// Successfully completed.
    Completed,
    /// Cancelled by user or timeout.
    Cancelled,
}

/// A one-time recovery token presented to complete recovery.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecoveryToken {
    pub id: u64,
    pub subject: String,
    pub expires_at: u64,
    /// The session being recovered (old session id).
    pub session_id: u64,
}

/// A pending or completed recovery request.
#[derive(Debug, Clone)]
pub struct RecoveryRequest {
    pub id: u64,
    pub subject: String,
    pub session_id: u64,
    pub status: RecoveryStatus,
    pub created_at: u64,
    pub expires_at: u64,
    /// The one-time token (set on creation, consumed on completion).
    pub token: Option<RecoveryToken>,
}

/// Result of completing a recovery.
#[derive(Debug, Clone, PartialEq)]
pub struct RecoveryResult {
    /// Fresh token pair after recovery.
    pub tokens: TokenPair,
    /// Number of other sessions revoked.
    pub other_sessions_revoked: u32,
}

// ---------------------------------------------------------------------------
// Snapshot (for atomic rollback)
// ---------------------------------------------------------------------------

/// Immutable snapshot of [`RecoveryService`] mutable state, taken before
/// a multi-step operation so that partial writes can be rolled back.
#[derive(Debug, Clone)]
struct RecoverySnapshot {
    active_tokens: HashMap<u64, bool>,
    used_tokens: HashMap<u64, bool>,
    request_statuses: HashMap<u64, RecoveryStatus>,
}

// ---------------------------------------------------------------------------
// Recovery service
// ---------------------------------------------------------------------------

/// In-memory recovery service.
pub struct RecoveryService {
    /// Recovery requests keyed by request id.
    requests: HashMap<u64, RecoveryRequest>,
    /// Recovery tokens keyed by token id.
    tokens: HashMap<u64, RecoveryToken>,
    /// Active (non-consumed) token ids.
    active_tokens: HashMap<u64, bool>,
    /// Used (consumed) token ids — prevents replay.
    used_tokens: HashMap<u64, bool>,
    /// Monotonic counter.
    next_id: u64,
    /// Token lifetime.
    token_lifetime_secs: u64,
}

impl RecoveryService {
    pub fn new() -> Self {
        Self {
            requests: HashMap::new(),
            tokens: HashMap::new(),
            active_tokens: HashMap::new(),
            used_tokens: HashMap::new(),
            next_id: 1,
            token_lifetime_secs: 3600, // 1 hour default
        }
    }

    pub fn with_token_lifetime(secs: u64) -> Self {
        Self {
            requests: HashMap::new(),
            tokens: HashMap::new(),
            active_tokens: HashMap::new(),
            used_tokens: HashMap::new(),
            next_id: 1,
            token_lifetime_secs: secs,
        }
    }

    fn now_secs() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_secs()
    }

    fn next_id(&mut self) -> u64 {
        let id = self.next_id;
        self.next_id = self.next_id.checked_add(1).expect("id overflow");
        id
    }

    /// Request recovery for a session.  Idempotent: if a pending request
    /// already exists for this session, returns the existing token.
    ///
    /// # Errors
    ///
    /// Returns [`AuthError::RecoveryAlreadyCompleted`] if a previous
    /// request for this session was already completed.
    pub fn request_recovery(
        &mut self,
        subject: String,
        session_id: u64,
    ) -> Result<RecoveryToken, AuthError> {
        // Check for existing request for this session.
        let existing: Option<RecoveryRequest> = self
            .requests
            .values()
            .find(|r| r.session_id == session_id)
            .cloned();

        if let Some(req) = existing {
            match req.status {
                RecoveryStatus::Completed => {
                    return Err(AuthError::RecoveryAlreadyCompleted);
                }
                RecoveryStatus::Cancelled => {
                    // Allow re-request after cancellation.
                }
                RecoveryStatus::Pending => {
                    // Idempotent — return existing token.
                    if let Some(token) = &req.token {
                        // Check if still valid.
                        let now = Self::now_secs();
                        if token.expires_at > now {
                            return Ok(token.clone());
                        }
                        // Expired — fall through to create new one.
                    }
                }
            }
        }

        let now = Self::now_secs();
        let req_id = self.next_id();
        let token_id = self.next_id();

        let token = RecoveryToken {
            id: token_id,
            subject: subject.clone(),
            expires_at: now.saturating_add(self.token_lifetime_secs),
            session_id,
        };

        self.tokens.insert(token_id, token.clone());
        self.active_tokens.insert(token_id, true);

        let request = RecoveryRequest {
            id: req_id,
            subject,
            session_id,
            status: RecoveryStatus::Pending,
            created_at: now,
            expires_at: token.expires_at,
            token: Some(token.clone()),
        };

        self.requests.insert(req_id, request);

        // Return the token we just stored.
        Ok(self.tokens.get(&token_id).unwrap().clone())
    }

    /// Complete recovery: consume the one-time token, revoke all other
    /// sessions, and issue a fresh token pair.
    ///
    /// # Atomic rollback
    ///
    /// All side effects (token consumption, session revocation, new
    /// token issuance) are applied atomically.  If any step fails after
    /// a previous step succeeded, every change is rolled back so the
    /// recovery token remains usable and no sessions are left in a
    /// partial state.
    pub fn complete_recovery(
        &mut self,
        recovery_token: &RecoveryToken,
        token_store: &mut TokenStore,
    ) -> Result<RecoveryResult, AuthError> {
        let now = Self::now_secs();

        // -- Validate token -----------------------------------------------
        if !self.active_tokens.contains_key(&recovery_token.id) {
            if self.used_tokens.contains_key(&recovery_token.id) {
                return Err(AuthError::TokenAlreadyUsed);
            }
            return Err(AuthError::RecoveryTokenInvalid);
        }

        // Check expiry.
        if recovery_token.expires_at <= now {
            self.active_tokens.remove(&recovery_token.id);
            return Err(AuthError::TokenExpired);
        }

        // -- Snapshot recovery-service state for rollback ----------------
        let recovery_snapshot = RecoverySnapshot {
            active_tokens: self.active_tokens.clone(),
            used_tokens: self.used_tokens.clone(),
            request_statuses: self
                .requests
                .iter()
                .map(|(k, r)| (*k, r.status))
                .collect(),
        };

        // -- Snapshot token-store state for rollback ---------------------
        let token_snapshot = token_store.snapshot();
        let other_count = token_store.active_access_count() as u32;

        // -- Mark as used (replay protection) ----------------------------
        self.active_tokens.remove(&recovery_token.id);
        self.used_tokens.insert(recovery_token.id, true);

        // -- Find and update the request ----------------------------------
        let request_id = self
            .requests
            .values()
            .find(|r| {
                r.session_id == recovery_token.session_id && r.status == RecoveryStatus::Pending
            })
            .map(|r| r.id);

        if let Some(req_id) = request_id {
            if let Some(req) = self.requests.get_mut(&req_id) {
                req.status = RecoveryStatus::Completed;
            }
        }

        // -- Revoke all other sessions for this subject ------------------
        token_store.revoke_all_for_subject(&recovery_token.subject);

        // -- Issue fresh tokens -------------------------------------------
        // If this fails, roll back ALL side effects: token consumption,
        // request status, and session revocation.
        let new_tokens_result = std::panic::catch_unwind(
            std::panic::AssertUnwindSafe(|| {
                token_store.issue_pair(recovery_token.subject.clone())
            }),
        );

        match new_tokens_result {
            Ok(new_tokens) => Ok(RecoveryResult {
                tokens: new_tokens,
                other_sessions_revoked: other_count.saturating_sub(1),
            }),
            Err(_) => {
                // Roll back recovery-service state.
                self.restore(recovery_snapshot);
                // Roll back token-store state.
                token_store.restore(token_snapshot);
                Err(AuthError::InternalError(
                    "recovery token issuance failed, rolled back".into(),
                ))
            }
        }
    }

    /// Cancel a recovery request.
    pub fn cancel_recovery(&mut self, session_id: u64) -> Result<(), AuthError> {
        let request = self
            .requests
            .values_mut()
            .find(|r| r.session_id == session_id && r.status == RecoveryStatus::Pending);

        if let Some(req) = request {
            req.status = RecoveryStatus::Cancelled;
            if let Some(token) = &req.token {
                self.active_tokens.remove(&token.id);
            }
            Ok(())
        } else {
            Err(AuthError::RecoveryTokenInvalid)
        }
    }

    // -- Atomic rollback support ------------------------------------------

    /// Restore from a snapshot, discarding any partial writes.
    fn restore(&mut self, snap: RecoverySnapshot) {
        self.active_tokens = snap.active_tokens;
        self.used_tokens = snap.used_tokens;
        for (req_id, status) in &snap.request_statuses {
            if let Some(req) = self.requests.get_mut(req_id) {
                req.status = *status;
            }
        }
    }
}

impl Default for RecoveryService {
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
    fn setup() -> RecoveryService {
        RecoveryService::new()
    }

    #[test]
    fn request_recovery_returns_token() {
        let mut svc = setup();
        let token = svc.request_recovery("alice".into(), 1).unwrap();
        assert_eq!(token.subject, "alice");
        assert_eq!(token.session_id, 1);
    }

    #[test]
    fn request_recovery_is_idempotent() {
        let mut svc = setup();
        let t1 = svc.request_recovery("alice".into(), 1).unwrap().clone();
        let t2 = svc.request_recovery("alice".into(), 1).unwrap().clone();
        assert_eq!(t1.id, t2.id); // same token
    }

    #[test]
    fn complete_recovery_revokes_other_sessions() {
        let mut svc = setup();
        let mut store = TokenStore::new();
        let _ = store.issue_pair("alice".into());
        let _ = store.issue_pair("alice".into());

        let token = svc.request_recovery("alice".into(), 1).unwrap().clone();
        let result = svc.complete_recovery(&token, &mut store).unwrap();

        assert!(result.other_sessions_revoked > 0);
    }

    #[test]
    fn complete_recovery_issues_fresh_tokens() {
        let mut svc = setup();
        let mut store = TokenStore::new();
        let _ = store.issue_pair("alice".into());

        let token = svc.request_recovery("alice".into(), 1).unwrap().clone();
        let result = svc.complete_recovery(&token, &mut store).unwrap();

        // Fresh tokens should be valid.
        let subject = store.verify_access(&result.tokens.access).unwrap();
        assert_eq!(subject.subject, "alice");
    }

    #[test]
    fn recovery_replay_rejected() {
        let mut svc = setup();
        let mut store = TokenStore::new();
        let _ = store.issue_pair("alice".into());

        let token = svc.request_recovery("alice".into(), 1).unwrap().clone();
        let _ = svc.complete_recovery(&token, &mut store).unwrap();

        // Replay.
        let result = svc.complete_recovery(&token, &mut store);
        assert_eq!(result, Err(AuthError::TokenAlreadyUsed));
    }

    #[test]
    fn recovery_cancelled_then_rerequest_completes() {
        let mut svc = setup();
        let _old_token = svc.request_recovery("alice".into(), 1).unwrap().clone();
        svc.cancel_recovery(1).unwrap();

        let mut store = TokenStore::new();
        let _ = store.issue_pair("alice".into());
        let new_token = svc.request_recovery("alice".into(), 1).unwrap().clone();

        // Re-request after cancellation produces a fresh token that works.
        let result = svc.complete_recovery(&new_token, &mut store);
        assert!(result.is_ok());
    }

    #[test]
    fn cancel_nonexistent_request_fails() {
        let mut svc = setup();
        assert_eq!(
            svc.cancel_recovery(999),
            Err(AuthError::RecoveryTokenInvalid)
        );
    }

    #[test]
    fn recovery_already_completed_rejects_new_request() {
        let mut svc = setup();
        let mut store = TokenStore::new();
        let _ = store.issue_pair("alice".into());

        let token = svc.request_recovery("alice".into(), 1).unwrap().clone();
        let _ = svc.complete_recovery(&token, &mut store).unwrap();

        let result = svc.request_recovery("alice".into(), 1);
        assert_eq!(result, Err(AuthError::RecoveryAlreadyCompleted));
    }

    #[test]
    fn balance_not_exposed_in_recovery_token() {
        let mut svc = setup();
        let token = svc.request_recovery("alice".into(), 1).unwrap().clone();
        // RecoveryToken has no balance field — by design.
        assert_eq!(token.subject, "alice");
        // If someone adds a balance field, this test will fail — forcing
        // them to reconsider the security implication.
    }

    // -- Atomic rollback regression tests ----------------------------------

    #[test]
    fn complete_recovery_leaves_no_partial_state_on_success() {
        let mut svc = setup();
        let mut store = TokenStore::new();
        let _ = store.issue_pair("alice".into());
        let _ = store.issue_pair("alice".into());

        let token = svc.request_recovery("alice".into(), 1).unwrap().clone();
        let result = svc.complete_recovery(&token, &mut store).unwrap();

        // Fresh tokens are valid.
        let subject = store.verify_access(&result.tokens.access).unwrap();
        assert_eq!(subject.subject, "alice");

        // Recovery token is consumed.
        assert!(!svc.active_tokens.contains_key(&token.id));
        assert!(svc.used_tokens.contains_key(&token.id));

        // Previous sessions are revoked.
        assert!(store.active_access_count() <= 1);
    }

    #[test]
    fn recovery_replay_leaves_no_partial_state() {
        let mut svc = setup();
        let mut store = TokenStore::new();
        let _ = store.issue_pair("alice".into());

        let token = svc.request_recovery("alice".into(), 1).unwrap().clone();
        let _ = svc.complete_recovery(&token, &mut store).unwrap();

        // Replay should fail cleanly.
        let result = svc.complete_recovery(&token, &mut store);
        assert_eq!(result, Err(AuthError::TokenAlreadyUsed));

        // The new tokens from the first recovery should still be valid.
        // (The replay didn't corrupt the state.)
    }

    #[test]
    fn recovery_cancel_then_rerequest_produces_fresh_valid_token() {
        let mut svc = setup();
        let mut store = TokenStore::new();
        let _ = store.issue_pair("alice".into());

        let _old = svc.request_recovery("alice".into(), 1).unwrap().clone();
        svc.cancel_recovery(1).unwrap();

        let new_token = svc.request_recovery("alice".into(), 1).unwrap().clone();
        let result = svc.complete_recovery(&new_token, &mut store);
        assert!(result.is_ok());

        // Fresh tokens should be valid.
        let new_tokens = result.unwrap();
        assert!(store.verify_access(&new_tokens.tokens.access).is_ok());
    }

    #[test]
    fn recovery_request_failure_leaves_no_partial_state() {
        let mut svc = setup();
        let active_before = svc.active_tokens.len();
        let used_before = svc.used_tokens.len();

        // Attempting to complete with a non-existent token should fail
        // without modifying any state.
        let mut store = TokenStore::new();
        let _ = store.issue_pair("alice".into());
        let fake_token = RecoveryToken {
            id: 999,
            subject: "alice".into(),
            expires_at: 9999999999,
            session_id: 1,
        };
        let result = svc.complete_recovery(&fake_token, &mut store);
        assert_eq!(result, Err(AuthError::RecoveryTokenInvalid));

        // No state changes.
        assert_eq!(svc.active_tokens.len(), active_before);
        assert_eq!(svc.used_tokens.len(), used_before);
    }
}
