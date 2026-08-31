//! Authentication error types.
//!
//! Every variant carries enough context for both user-facing messages
//! and structured logging.  Errors are the *only* way auth functions
//! signal failure — no panics, no unwraps, no partial state.

use std::fmt;

/// Errors specific to authentication and recovery flows.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AuthError {
    // -- Token lifecycle ---------------------------------------------------
    /// The access or refresh token has expired.
    TokenExpired,
    /// The token was revoked (logout, device change, etc.).
    TokenRevoked,
    /// The token signature or structure is invalid.
    TokenInvalid(String),
    /// The token has already been consumed (replay protection).
    TokenAlreadyUsed,

    // -- Credential validation ---------------------------------------------
    /// The provided credentials are incorrect.
    InvalidCredentials,
    /// The account is locked due to too many failed attempts.
    AccountLocked { retry_after_secs: u64 },
    /// The account has been deactivated.
    AccountDeactivated,

    // -- Recovery ----------------------------------------------------------
    /// The recovery token is invalid or expired.
    RecoveryTokenInvalid,
    /// The recovery request has already been completed.
    RecoveryAlreadyCompleted,
    /// The recovery request is still pending (cannot re-submit).
    RecoveryPending,
    /// The recovery request has been cancelled.
    RecoveryCancelled,

    // -- Session -----------------------------------------------------------
    /// The session does not exist or was terminated.
    SessionNotFound,
    /// The session was superseded by a new login (device conflict).
    SessionSuperseded,
    /// Concurrent modification detected (optimistic locking failure).
    ConcurrencyConflict,

    // -- Validation --------------------------------------------------------
    /// The amount or balance in the auth payload failed precision checks.
    AmountValidationFailed(String),
    /// A required field is missing or malformed.
    ValidationError(String),

    // -- State transition --------------------------------------------------
    /// A state transition was not in the legal transition matrix.
    InvalidStateTransition(String),

    // -- Internal ----------------------------------------------------------
    /// An internal invariant was violated.  Should never surface to callers.
    InternalError(String),
}

impl fmt::Display for AuthError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TokenExpired => write!(f, "token has expired"),
            Self::TokenRevoked => write!(f, "token has been revoked"),
            Self::TokenInvalid(detail) => write!(f, "invalid token: {detail}"),
            Self::TokenAlreadyUsed => write!(f, "token has already been used"),
            Self::InvalidCredentials => write!(f, "invalid credentials"),
            Self::AccountLocked { retry_after_secs } => {
                write!(f, "account locked, retry after {retry_after_secs}s")
            }
            Self::AccountDeactivated => write!(f, "account is deactivated"),
            Self::RecoveryTokenInvalid => write!(f, "recovery token is invalid"),
            Self::RecoveryAlreadyCompleted => write!(f, "recovery already completed"),
            Self::RecoveryPending => write!(f, "recovery request is still pending"),
            Self::RecoveryCancelled => write!(f, "recovery request has been cancelled"),
            Self::SessionNotFound => write!(f, "session not found"),
            Self::SessionSuperseded => write!(f, "session superseded by newer login"),
            Self::ConcurrencyConflict => write!(f, "concurrent modification conflict"),
            Self::AmountValidationFailed(msg) => write!(f, "amount validation: {msg}"),
            Self::ValidationError(msg) => write!(f, "validation: {msg}"),
            Self::InvalidStateTransition(msg) => write!(f, "invalid state transition: {msg}"),
            Self::InternalError(msg) => write!(f, "internal error: {msg}"),
        }
    }
}

impl std::error::Error for AuthError {}
