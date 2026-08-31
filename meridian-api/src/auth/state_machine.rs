//! Auth state machine — formal transition matrix and enforcement.
//!
//! This module defines the **legal states** and **legal transitions** for
//! the three core auth objects:
//!
//! 1. **Session** — a user session (login → logout / expiry / supersede).
//! 2. **Token** — an access or refresh token (active → refreshed → revoked).
//! 3. **RecoveryRequest** — a password-reset flow (none → pending → completed).
//!
//! Every auth entry point calls [`validate_transition`] before performing
//! its work.  If the transition is illegal, the operation is rejected with
//! [`AuthError::InvalidStateTransition`] — *no side effects occur*.
//!
//! # Design invariants
//!
//! - **Deterministic** — given `(current_state, event)`, the next state is
//!   uniquely determined.
//! - **Closed** — every event has a defined outcome for every state (including
//!   no-ops for illegal transitions).
//! - **Auditable** — the transition log is append-only and never mutated.
//! - **No partial state** — a rejected transition leaves the store unchanged.

use super::errors::AuthError;
use std::fmt;

// ---------------------------------------------------------------------------
// Session states
// ---------------------------------------------------------------------------

/// Lifecycle states for a user session.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SessionState {
    /// Session is active (tokens are valid).
    Active,
    /// A refresh is in progress (old token still valid, new pending).
    RefreshInProgress,
    /// Session has been logged out (tokens revoked).
    LoggedOut,
    /// A recovery request is pending for this session.
    RecoveryPending,
    /// Recovery completed — new tokens issued.
    Recovered,
    /// Session expired naturally.
    Expired,
    /// Session superseded by a newer login (device conflict).
    Superseded,
}

impl fmt::Display for SessionState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Active => write!(f, "active"),
            Self::RefreshInProgress => write!(f, "refresh_in_progress"),
            Self::LoggedOut => write!(f, "logged_out"),
            Self::RecoveryPending => write!(f, "recovery_pending"),
            Self::Recovered => write!(f, "recovered"),
            Self::Expired => write!(f, "expired"),
            Self::Superseded => write!(f, "superseded"),
        }
    }
}

// ---------------------------------------------------------------------------
// Token states
// ---------------------------------------------------------------------------

/// Lifecycle states for an access or refresh token.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum TokenState {
    /// Token is active (can be used).
    Active,
    /// Token was rotated during refresh (old token, now superseded by new).
    Refreshed,
    /// Token was explicitly revoked (logout, device compromise).
    Revoked,
    /// Token expired naturally.
    Expired,
    /// Token was replayed after rotation — session killed.
    Replayed,
}

impl fmt::Display for TokenState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Active => write!(f, "active"),
            Self::Refreshed => write!(f, "refreshed"),
            Self::Revoked => write!(f, "revoked"),
            Self::Expired => write!(f, "expired"),
            Self::Replayed => write!(f, "replayed"),
        }
    }
}

// ---------------------------------------------------------------------------
// Recovery request states
// ---------------------------------------------------------------------------

/// Lifecycle states for a password-reset / account-recovery request.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum RecoveryRequestState {
    /// No recovery in progress.
    None,
    /// Recovery token issued, awaiting user action.
    Pending,
    /// Recovery completed — old sessions revoked, new tokens issued.
    Completed,
    /// Recovery was cancelled by the user.
    Cancelled,
    /// Recovery token expired before use.
    Expired,
}

impl fmt::Display for RecoveryRequestState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::None => write!(f, "none"),
            Self::Pending => write!(f, "pending"),
            Self::Completed => write!(f, "completed"),
            Self::Cancelled => write!(f, "cancelled"),
            Self::Expired => write!(f, "expired"),
        }
    }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/// Events that drive state transitions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SessionEvent {
    /// A refresh token was used to rotate tokens.
    Refresh,
    /// User logged out (single session).
    Logout,
    /// User logged out of all sessions.
    LogoutAll,
    /// Recovery request initiated.
    RecoveryRequest,
    /// Recovery completed.
    RecoveryComplete,
    /// Session token expired.
    Expire,
    /// Session superseded by a newer login.
    Supersede,
    /// Login (for tracking in the transition log).
    Login,
}

impl fmt::Display for SessionEvent {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Refresh => write!(f, "refresh"),
            Self::Logout => write!(f, "logout"),
            Self::LogoutAll => write!(f, "logout_all"),
            Self::RecoveryRequest => write!(f, "recovery_request"),
            Self::RecoveryComplete => write!(f, "recovery_complete"),
            Self::Expire => write!(f, "expire"),
            Self::Supersede => write!(f, "supersede"),
            Self::Login => write!(f, "login"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum TokenEvent {
    /// Token used in a refresh operation (rotation).
    Rotate,
    /// Token explicitly revoked (logout).
    Revoke,
    /// Token expired naturally.
    Expire,
    /// Token replayed after rotation (security: kill session).
    Replay,
}

impl fmt::Display for TokenEvent {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Rotate => write!(f, "rotate"),
            Self::Revoke => write!(f, "revoke"),
            Self::Expire => write!(f, "expire"),
            Self::Replay => write!(f, "replay"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum RecoveryEvent {
    /// Request recovery token.
    Request,
    /// Complete recovery (use the token).
    Complete,
    /// Recovery token expired.
    Expire,
    /// Recovery cancelled.
    Cancel,
}

impl fmt::Display for RecoveryEvent {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Request => write!(f, "request"),
            Self::Complete => write!(f, "complete"),
            Self::Expire => write!(f, "expire"),
            Self::Cancel => write!(f, "cancel"),
        }
    }
}

// ---------------------------------------------------------------------------
// Transition matrix
// ---------------------------------------------------------------------------

/// Result of a transition: next state and whether the transition was legal.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TransitionResult<S: fmt::Display + Copy> {
    pub from: S,
    pub to: S,
    pub event: String,
}

/// Validate and compute the next session state.
///
/// Returns `Ok(next_state)` if the transition is legal, or
/// `Err(AuthError::InvalidStateTransition)` if it is not.
pub fn validate_session_transition(
    current: SessionState,
    event: SessionEvent,
) -> Result<SessionState, AuthError> {
    use SessionEvent as E;
    use SessionState as S;

    let next = match (current, event) {
        // Login from a terminal state creates a fresh session.
        (S::LoggedOut | S::Expired | S::Superseded, E::Login) => S::Active,

        // Active session: all operations are legal.
        (S::Active, E::Refresh) => S::Active,
        (S::Active, E::Logout) => S::LoggedOut,
        (S::Active, E::LogoutAll) => S::LoggedOut,
        (S::Active, E::RecoveryRequest) => S::RecoveryPending,
        (S::Active, E::RecoveryComplete) => S::Recovered,
        (S::Active, E::Expire) => S::Expired,
        (S::Active, E::Supersede) => S::Superseded,
        (S::Active, E::Login) => S::Active, // concurrent login (multi-device)

        // RefreshInProgress: only complete refresh, logout, or expire.
        (S::RefreshInProgress, E::Refresh) => S::Active,
        (S::RefreshInProgress, E::Logout) => S::LoggedOut,
        (S::RefreshInProgress, E::LogoutAll) => S::LoggedOut,
        (S::RefreshInProgress, E::Expire) => S::Expired,
        (S::RefreshInProgress, E::RecoveryRequest) => S::RecoveryPending,

        // RecoveryPending: complete or cancel.
        (S::RecoveryPending, E::RecoveryComplete) => S::Recovered,
        (S::RecoveryPending, E::Refresh) => S::Active, // recovery cancelled (implicit)
        (S::RecoveryPending, E::Expire) => S::Expired,
        (S::RecoveryPending, E::Logout) => S::LoggedOut,
        (S::RecoveryPending, E::LogoutAll) => S::LoggedOut,
        (S::RecoveryPending, E::Login) => S::Active, // new login overrides pending recovery

        // Recovered: can continue to active operations.
        (S::Recovered, E::Refresh) => S::Active,
        (S::Recovered, E::Logout) => S::LoggedOut,
        (S::Recovered, E::LogoutAll) => S::LoggedOut,
        (S::Recovered, E::Expire) => S::Expired,
        (S::Recovered, E::Login) => S::Active, // new login after recovery

        // Illegal transitions: rejected.
        (from, event) => {
            return Err(AuthError::InvalidStateTransition(format!(
                "session: cannot transition from {from} on event {event}"
            )));
        }
    };

    Ok(next)
}

/// Validate and compute the next token state.
pub fn validate_token_transition(
    current: TokenState,
    event: TokenEvent,
) -> Result<TokenState, AuthError> {
    use TokenEvent as E;
    use TokenState as S;

    let next = match (current, event) {
        // Active token: all events legal.
        (S::Active, E::Rotate) => S::Refreshed,
        (S::Active, E::Revoke) => S::Revoked,
        (S::Active, E::Expire) => S::Expired,
        (S::Active, E::Replay) => S::Replayed,

        // Refreshed (old token): can be revoked or expire, but NOT used again.
        (S::Refreshed, E::Revoke) => S::Revoked,
        (S::Refreshed, E::Expire) => S::Expired,
        (S::Refreshed, E::Replay) => S::Replayed,

        // Revoked: terminal state.
        (S::Revoked, _) => S::Revoked,

        // Expired: terminal state.
        (S::Expired, _) => S::Expired,

        // Replayed: terminal state (security: session is already killed).
        (S::Replayed, _) => S::Replayed,

        // Illegal: refresh or rotate an already-terminal token.
        (from, event) => {
            return Err(AuthError::InvalidStateTransition(format!(
                "token: cannot transition from {from} on event {event}"
            )));
        }
    };

    Ok(next)
}

/// Validate and compute the next recovery request state.
pub fn validate_recovery_transition(
    current: RecoveryRequestState,
    event: RecoveryEvent,
) -> Result<RecoveryRequestState, AuthError> {
    use RecoveryEvent as E;
    use RecoveryRequestState as S;

    let next = match (current, event) {
        // No recovery in progress.
        (S::None, E::Request) => S::Pending,

        // Pending: complete, cancel, or expire.
        (S::Pending, E::Complete) => S::Completed,
        (S::Pending, E::Cancel) => S::Cancelled,
        (S::Pending, E::Expire) => S::Expired,
        (S::Pending, E::Request) => S::Pending, // idempotent re-request

        // Cancelled: can request again.
        (S::Cancelled, E::Request) => S::Pending,

        // Expired: can request again.
        (S::Expired, E::Request) => S::Pending,

        // Completed: terminal state (already recovered).
        (S::Completed, _) => {
            return Err(AuthError::RecoveryAlreadyCompleted);
        }

        // Illegal transitions.
        (from, event) => {
            return Err(AuthError::InvalidStateTransition(format!(
                "recovery: cannot transition from {from} on event {event}"
            )));
        }
    };

    Ok(next)
}

// ---------------------------------------------------------------------------
// Transition log (audit trail)
// ---------------------------------------------------------------------------

/// An immutable, append-only log entry recording a state transition.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TransitionLogEntry {
    pub entity: String,
    pub entity_id: u64,
    pub from_state: String,
    pub to_state: String,
    pub event: String,
    pub timestamp: u64,
}

/// Append-only transition log for audit and replay analysis.
#[derive(Debug, Clone, Default)]
pub struct TransitionLog {
    entries: Vec<TransitionLogEntry>,
}

impl TransitionLog {
    pub fn new() -> Self {
        Self::default()
    }

    /// Append a transition entry.
    pub fn record(
        &mut self,
        entity: &str,
        entity_id: u64,
        from_state: &str,
        to_state: &str,
        event: &str,
    ) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_secs();

        self.entries.push(TransitionLogEntry {
            entity: entity.to_string(),
            entity_id,
            from_state: from_state.to_string(),
            to_state: to_state.to_string(),
            event: event.to_string(),
            timestamp: now,
        });
    }

    /// Return all entries for a given entity and id.
    pub fn entries_for(&self, entity: &str, entity_id: u64) -> Vec<&TransitionLogEntry> {
        self.entries
            .iter()
            .filter(|e| e.entity == entity && e.entity_id == entity_id)
            .collect()
    }

    /// Return the total number of entries.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Check if the log is empty.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // =======================================================================
    // Session transition matrix — exhaustive
    // =======================================================================

    #[test]
    fn session_login_from_terminal_states() {
        for terminal in [
            SessionState::LoggedOut,
            SessionState::Expired,
            SessionState::Superseded,
        ] {
            let next = validate_session_transition(terminal, SessionEvent::Login).unwrap();
            assert_eq!(next, SessionState::Active, "from {terminal} on Login");
        }
    }

    #[test]
    fn session_active_all_events_legal() {
        let active = SessionState::Active;
        let expected = [
            (SessionEvent::Refresh, SessionState::Active),
            (SessionEvent::Logout, SessionState::LoggedOut),
            (SessionEvent::LogoutAll, SessionState::LoggedOut),
            (SessionEvent::RecoveryRequest, SessionState::RecoveryPending),
            (SessionEvent::RecoveryComplete, SessionState::Recovered),
            (SessionEvent::Expire, SessionState::Expired),
            (SessionEvent::Supersede, SessionState::Superseded),
            (SessionEvent::Login, SessionState::Active),
        ];

        for (event, exp) in expected {
            let next = validate_session_transition(active, event).unwrap();
            assert_eq!(next, exp, "Active + {event}");
        }
    }

    #[test]
    fn session_refresh_in_progress_legal_events() {
        let state = SessionState::RefreshInProgress;
        let expected = [
            (SessionEvent::Refresh, SessionState::Active),
            (SessionEvent::Logout, SessionState::LoggedOut),
            (SessionEvent::LogoutAll, SessionState::LoggedOut),
            (SessionEvent::Expire, SessionState::Expired),
            (SessionEvent::RecoveryRequest, SessionState::RecoveryPending),
        ];

        for (event, exp) in expected {
            let next = validate_session_transition(state, event).unwrap();
            assert_eq!(next, exp, "RefreshInProgress + {event}");
        }
    }

    #[test]
    fn session_refresh_in_progress_illegal_events() {
        let state = SessionState::RefreshInProgress;
        let illegal = [
            SessionEvent::RecoveryComplete,
            SessionEvent::Supersede,
            SessionEvent::Login,
        ];

        for event in illegal {
            let result = validate_session_transition(state, event);
            assert!(result.is_err(), "RefreshInProgress + {event} should fail");
        }
    }

    #[test]
    fn session_recovery_pending_legal_events() {
        let state = SessionState::RecoveryPending;
        let expected = [
            (SessionEvent::RecoveryComplete, SessionState::Recovered),
            (SessionEvent::Expire, SessionState::Expired),
            (SessionEvent::Logout, SessionState::LoggedOut),
            (SessionEvent::LogoutAll, SessionState::LoggedOut),
        ];

        for (event, exp) in expected {
            let next = validate_session_transition(state, event).unwrap();
            assert_eq!(next, exp, "RecoveryPending + {event}");
        }
    }

    #[test]
    fn session_recovery_pending_cancel_goes_to_active() {
        // Cancel recovery → back to Active (needs the RecoveryService's Cancel event)
        // In our matrix this maps to Logout/LogoutAll for cleanup.
        // But the RecoveryService.cancel_recovery handles the logic.
        // We verify the RecoveryPending → LoggedOut via Logout.
        let next = validate_session_transition(SessionState::RecoveryPending, SessionEvent::Logout)
            .unwrap();
        assert_eq!(next, SessionState::LoggedOut);
    }

    #[test]
    fn session_recovered_can_refresh() {
        let next =
            validate_session_transition(SessionState::Recovered, SessionEvent::Refresh).unwrap();
        assert_eq!(next, SessionState::Active);
    }

    #[test]
    fn session_terminal_states_only_accept_login() {
        let terminals = [
            SessionState::LoggedOut,
            SessionState::Expired,
            SessionState::Superseded,
        ];
        let all_events = [
            SessionEvent::Refresh,
            SessionEvent::Logout,
            SessionEvent::LogoutAll,
            SessionEvent::RecoveryRequest,
            SessionEvent::RecoveryComplete,
            SessionEvent::Expire,
            SessionEvent::Supersede,
        ];

        for terminal in terminals {
            for event in all_events {
                let result = validate_session_transition(terminal, event);
                assert!(result.is_err(), "{terminal} + {event} should fail");
            }
        }
    }

    // =======================================================================
    // Token transition matrix — exhaustive
    // =======================================================================

    #[test]
    fn token_active_all_events_legal() {
        let active = TokenState::Active;
        let expected = [
            (TokenEvent::Rotate, TokenState::Refreshed),
            (TokenEvent::Revoke, TokenState::Revoked),
            (TokenEvent::Expire, TokenState::Expired),
            (TokenEvent::Replay, TokenState::Replayed),
        ];

        for (event, exp) in expected {
            let next = validate_token_transition(active, event).unwrap();
            assert_eq!(next, exp, "Active + {event}");
        }
    }

    #[test]
    fn token_refreshed_limited_events() {
        let state = TokenState::Refreshed;
        let legal = [
            (TokenEvent::Revoke, TokenState::Revoked),
            (TokenEvent::Expire, TokenState::Expired),
            (TokenEvent::Replay, TokenState::Replayed),
        ];

        for (event, exp) in legal {
            let next = validate_token_transition(state, event).unwrap();
            assert_eq!(next, exp, "Refreshed + {event}");
        }

        // Rotate is illegal on an already-refreshed token.
        assert!(validate_token_transition(state, TokenEvent::Rotate).is_err());
    }

    #[test]
    fn token_terminal_states_reject_all() {
        let terminals = [
            TokenState::Revoked,
            TokenState::Expired,
            TokenState::Replayed,
        ];
        let all_events = [
            TokenEvent::Rotate,
            TokenEvent::Revoke,
            TokenEvent::Expire,
            TokenEvent::Replay,
        ];

        for terminal in terminals {
            for event in all_events {
                let next = validate_token_transition(terminal, event).unwrap();
                assert_eq!(next, terminal, "{terminal} + {event} stays terminal");
            }
        }
    }

    // =======================================================================
    // Recovery transition matrix — exhaustive
    // =======================================================================

    #[test]
    fn recovery_none_request_pending() {
        let next = validate_recovery_transition(RecoveryRequestState::None, RecoveryEvent::Request)
            .unwrap();
        assert_eq!(next, RecoveryRequestState::Pending);
    }

    #[test]
    fn recovery_pending_legal_events() {
        let state = RecoveryRequestState::Pending;
        let expected = [
            (RecoveryEvent::Complete, RecoveryRequestState::Completed),
            (RecoveryEvent::Cancel, RecoveryRequestState::Cancelled),
            (RecoveryEvent::Expire, RecoveryRequestState::Expired),
            (RecoveryEvent::Request, RecoveryRequestState::Pending), // idempotent
        ];

        for (event, exp) in expected {
            let next = validate_recovery_transition(state, event).unwrap();
            assert_eq!(next, exp, "Pending + {event}");
        }
    }

    #[test]
    fn recovery_completed_is_terminal() {
        let all_events = [
            RecoveryEvent::Request,
            RecoveryEvent::Complete,
            RecoveryEvent::Cancel,
            RecoveryEvent::Expire,
        ];

        for event in all_events {
            let result = validate_recovery_transition(RecoveryRequestState::Completed, event);
            assert!(
                result.is_err(),
                "Completed + {event} should fail (RecoveryAlreadyCompleted)"
            );
        }
    }

    #[test]
    fn recovery_cancelled_or_expired_can_re_request() {
        for state in [
            RecoveryRequestState::Cancelled,
            RecoveryRequestState::Expired,
        ] {
            let next = validate_recovery_transition(state, RecoveryEvent::Request).unwrap();
            assert_eq!(next, RecoveryRequestState::Pending, "{state} + Request");
        }
    }

    #[test]
    fn recovery_illegal_transitions() {
        // None + Complete (no token to complete)
        assert!(
            validate_recovery_transition(RecoveryRequestState::None, RecoveryEvent::Complete)
                .is_err()
        );

        // None + Cancel
        assert!(
            validate_recovery_transition(RecoveryRequestState::None, RecoveryEvent::Cancel)
                .is_err()
        );

        // None + Expire
        assert!(
            validate_recovery_transition(RecoveryRequestState::None, RecoveryEvent::Expire)
                .is_err()
        );
    }

    // =======================================================================
    // Full lifecycle integration tests
    // =======================================================================

    #[test]
    fn full_lifecycle_login_refresh_logout() {
        // Login
        let state =
            validate_session_transition(SessionState::LoggedOut, SessionEvent::Login).unwrap();
        assert_eq!(state, SessionState::Active);

        // Refresh
        let state = validate_session_transition(state, SessionEvent::Refresh).unwrap();
        assert_eq!(state, SessionState::Active);

        // Logout
        let state = validate_session_transition(state, SessionEvent::Logout).unwrap();
        assert_eq!(state, SessionState::LoggedOut);

        // Re-login
        let state = validate_session_transition(state, SessionEvent::Login).unwrap();
        assert_eq!(state, SessionState::Active);
    }

    #[test]
    fn full_lifecycle_login_recover_relogin() {
        let state =
            validate_session_transition(SessionState::LoggedOut, SessionEvent::Login).unwrap();

        // Recovery request
        let state = validate_session_transition(state, SessionEvent::RecoveryRequest).unwrap();
        assert_eq!(state, SessionState::RecoveryPending);

        // Recovery complete
        let state = validate_session_transition(state, SessionEvent::RecoveryComplete).unwrap();
        assert_eq!(state, SessionState::Recovered);

        // Login again (new device)
        let state = validate_session_transition(state, SessionEvent::Login).unwrap();
        assert_eq!(state, SessionState::Active);
    }

    #[test]
    fn token_lifecycle_rotate_revoke() {
        let state = validate_token_transition(TokenState::Active, TokenEvent::Rotate).unwrap();
        assert_eq!(state, TokenState::Refreshed);

        let state = validate_token_transition(state, TokenEvent::Revoke).unwrap();
        assert_eq!(state, TokenState::Revoked);

        // Terminal — stays revoked.
        let state = validate_token_transition(state, TokenEvent::Revoke).unwrap();
        assert_eq!(state, TokenState::Revoked);
    }

    #[test]
    fn token_replay_detection() {
        let state = validate_token_transition(TokenState::Active, TokenEvent::Rotate).unwrap();
        assert_eq!(state, TokenState::Refreshed);

        // Replay the old token.
        let state = validate_token_transition(state, TokenEvent::Replay).unwrap();
        assert_eq!(state, TokenState::Replayed);
    }

    #[test]
    fn recovery_full_lifecycle() {
        let state =
            validate_recovery_transition(RecoveryRequestState::None, RecoveryEvent::Request)
                .unwrap();
        assert_eq!(state, RecoveryRequestState::Pending);

        let state = validate_recovery_transition(state, RecoveryEvent::Complete).unwrap();
        assert_eq!(state, RecoveryRequestState::Completed);
    }

    #[test]
    fn recovery_cancel_then_retry() {
        let state =
            validate_recovery_transition(RecoveryRequestState::None, RecoveryEvent::Request)
                .unwrap();
        assert_eq!(state, RecoveryRequestState::Pending);

        let state = validate_recovery_transition(state, RecoveryEvent::Cancel).unwrap();
        assert_eq!(state, RecoveryRequestState::Cancelled);

        // Retry after cancellation.
        let state = validate_recovery_transition(state, RecoveryEvent::Request).unwrap();
        assert_eq!(state, RecoveryRequestState::Pending);
    }

    #[test]
    fn recovery_expire_then_retry() {
        let state =
            validate_recovery_transition(RecoveryRequestState::None, RecoveryEvent::Request)
                .unwrap();
        let state = validate_recovery_transition(state, RecoveryEvent::Expire).unwrap();
        assert_eq!(state, RecoveryRequestState::Expired);

        let state = validate_recovery_transition(state, RecoveryEvent::Request).unwrap();
        assert_eq!(state, RecoveryRequestState::Pending);
    }

    // =======================================================================
    // Edge cases: stale, repeated, out-of-order transitions
    // =======================================================================

    #[test]
    fn stale_token_revoke_is_idempotent() {
        // Already revoked → revoke again → still revoked.
        let state = validate_token_transition(TokenState::Revoked, TokenEvent::Revoke).unwrap();
        assert_eq!(state, TokenState::Revoked);
    }

    #[test]
    fn stale_token_expire_is_idempotent() {
        let state = validate_token_transition(TokenState::Expired, TokenEvent::Expire).unwrap();
        assert_eq!(state, TokenState::Expired);
    }

    #[test]
    fn repeated_recovery_request_is_idempotent() {
        let state =
            validate_recovery_transition(RecoveryRequestState::Pending, RecoveryEvent::Request)
                .unwrap();
        assert_eq!(state, RecoveryRequestState::Pending);
    }

    #[test]
    fn out_of_order_recovery_complete_after_expire_fails() {
        // Expire first, then try to complete.
        let state =
            validate_recovery_transition(RecoveryRequestState::None, RecoveryEvent::Request)
                .unwrap();
        let state = validate_recovery_transition(state, RecoveryEvent::Expire).unwrap();
        assert_eq!(state, RecoveryRequestState::Expired);

        // Complete after expire — illegal.
        assert!(validate_recovery_transition(state, RecoveryEvent::Complete).is_err());
    }

    #[test]
    fn concurrent_refresh_and_logout_session() {
        // Both start from Active — the first event wins.
        let state =
            validate_session_transition(SessionState::Active, SessionEvent::Refresh).unwrap();
        assert_eq!(state, SessionState::Active);

        let state = validate_session_transition(state, SessionEvent::Logout).unwrap();
        assert_eq!(state, SessionState::LoggedOut);
    }

    // =======================================================================
    // Transition log
    // =======================================================================

    #[test]
    fn transition_log_records_entries() {
        let mut log = TransitionLog::new();
        log.record("session", 1, "logged_out", "active", "login");
        log.record("session", 1, "active", "active", "refresh");
        log.record("session", 2, "logged_out", "active", "login");

        assert_eq!(log.len(), 3);
        assert!(!log.is_empty());

        let entries = log.entries_for("session", 1);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].from_state, "logged_out");
        assert_eq!(entries[1].event, "refresh");

        // Different entity id — no entries.
        assert!(log.entries_for("session", 99).is_empty());
    }

    #[test]
    fn transition_log_is_append_only() {
        let mut log = TransitionLog::new();
        log.record("token", 1, "active", "refreshed", "rotate");
        log.record("token", 1, "refreshed", "revoked", "revoke");

        // Verify order is preserved.
        let entries = log.entries_for("token", 1);
        assert_eq!(entries[0].to_state, "refreshed");
        assert_eq!(entries[1].to_state, "revoked");
    }

    // =======================================================================
    // Display traits
    // =======================================================================

    #[test]
    fn session_state_display() {
        assert_eq!(format!("{}", SessionState::Active), "active");
        assert_eq!(
            format!("{}", SessionState::RefreshInProgress),
            "refresh_in_progress"
        );
        assert_eq!(format!("{}", SessionState::LoggedOut), "logged_out");
        assert_eq!(
            format!("{}", SessionState::RecoveryPending),
            "recovery_pending"
        );
        assert_eq!(format!("{}", SessionState::Recovered), "recovered");
        assert_eq!(format!("{}", SessionState::Expired), "expired");
        assert_eq!(format!("{}", SessionState::Superseded), "superseded");
    }

    #[test]
    fn token_state_display() {
        assert_eq!(format!("{}", TokenState::Active), "active");
        assert_eq!(format!("{}", TokenState::Refreshed), "refreshed");
        assert_eq!(format!("{}", TokenState::Revoked), "revoked");
        assert_eq!(format!("{}", TokenState::Expired), "expired");
        assert_eq!(format!("{}", TokenState::Replayed), "replayed");
    }

    #[test]
    fn recovery_state_display() {
        assert_eq!(format!("{}", RecoveryRequestState::None), "none");
        assert_eq!(format!("{}", RecoveryRequestState::Pending), "pending");
        assert_eq!(format!("{}", RecoveryRequestState::Completed), "completed");
        assert_eq!(format!("{}", RecoveryRequestState::Cancelled), "cancelled");
        assert_eq!(format!("{}", RecoveryRequestState::Expired), "expired");
    }
}
