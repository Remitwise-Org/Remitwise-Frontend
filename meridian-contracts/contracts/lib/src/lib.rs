#![no_std]

//! Shared contracts library with common reusable primitives.

#[cfg(feature = "soroban")]
pub mod access_control;
pub mod circuit_breaker;
#[cfg(any(feature = "soroban", feature = "ink"))]
pub mod errors;
#[cfg(feature = "soroban")]
pub mod events;
#[cfg(feature = "soroban")]
pub mod insurance_types;
#[cfg(feature = "soroban")]
pub mod random;
#[cfg(feature = "soroban")]
pub mod state_root;
#[cfg(any(feature = "soroban", feature = "ink"))]
pub mod validation;
#[cfg(all(feature = "verification", feature = "soroban"))]
pub mod verification;
#[cfg(feature = "soroban")]
pub mod zk;

#[cfg(feature = "soroban")]
pub use access_control::{
    has_role, init_access_control, require_role, revoke_role, set_role, AccessControlRole,
};
pub use circuit_breaker::*;
#[cfg(any(feature = "soroban", feature = "ink"))]
pub use errors::*;
#[cfg(feature = "soroban")]
pub use events::*;
#[cfg(feature = "soroban")]
pub use insurance_types::*;
#[cfg(feature = "soroban")]
pub use random::Randomness;
#[cfg(feature = "soroban")]
pub use state_root::{compute_root, get_state_root, set_state_root, MerkleHasher, StateRoot};
#[cfg(any(feature = "soroban", feature = "ink"))]
pub use validation::*;
#[cfg(feature = "soroban")]
pub use zk::*;
