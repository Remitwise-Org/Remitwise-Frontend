//! Authentication and account-recovery flows.
//!
//! This module implements sign-in, refresh, verification, logout, and
//! account recovery.  Every flow is safe across expiry, retries,
//! multiple tabs, and device changes.
//!
//! # Security invariants
//!
//! 1. **Stale tokens are rejected** — expired or revoked tokens never
//!    advance to an authoritative state.
//! 2. **Recovery is idempotent** — repeated recovery requests for the
//!    same session produce the same outcome.
//! 3. **Partial state on failure** — any failed or rejected operation
//!    leaves zero side-effects.
//! 4. **Amount boundaries** — financial amounts in recovery or balance
//!    snapshots are validated through [`crate::amount`] and never
//!    rounded or truncated silently.

pub mod errors;
pub mod flows;
pub mod recovery;
pub mod tokens;
pub mod validation;

pub use errors::AuthError;
pub use flows::{LoginResult, Session, Verifier};
pub use recovery::{RecoveryRequest, RecoveryResult, RecoveryToken};
pub use tokens::{RefreshToken, TokenPair, TokenStore, TokenStoreSnapshot, VerifyResult};
