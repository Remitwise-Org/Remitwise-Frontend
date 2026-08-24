use soroban_sdk::{Address, Env, Vec};

use crate::storage::DataKey;
use crate::types::BridgeConfig;
use stellar_insured_lib::{validate_address, validate_enum_range, validate_timestamp};

/// Panics if the bridge is paused.
///
/// Reads the config from storage via `&Env` — consistent with the escrow
/// contract's `require_not_paused` signature so all validation helpers
/// follow the same `&Env` convention (#353).
pub fn require_not_paused(env: &Env) {
    stellar_insured_lib::circuit_breaker::require_not_paused(env);
}

/// Panics if `destination_chain` is not in the supported chains list.
pub fn require_supported_chain(config: &BridgeConfig, destination_chain: u32) {
    if !config.supported_chains.contains(destination_chain) {
        panic!("{:?}", stellar_insured_lib::ValidationError::OutOfRange);
    }
}

/// Panics if `required_signatures` is outside the configured [min, max] range.
pub fn require_valid_signatures(config: &BridgeConfig, required_signatures: u32) {
    if required_signatures < config.min_signatures_required
        || required_signatures > config.max_signatures_required
    {
        panic!("{:?}", stellar_insured_lib::ValidationError::OutOfRange);
    }
}

/// Panics if `caller` is not in the operators list.
pub fn require_operator(env: &Env, caller: &Address) {
    let operators: Vec<Address> = env
        .storage()
        .instance()
        .get(&DataKey::Operators)
        .unwrap_or_else(|| panic!("Contract not initialized"));
    if !operators.contains(caller.clone()) {
        panic!("Not an operator");
    }
}

/// Panics if `caller` is not the stored admin.
pub fn require_admin(env: &Env, caller: &Address) {
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .unwrap_or_else(|| panic!("Contract not initialized"));
    if *caller != admin {
        panic!("Unauthorized");
    }
}

/// Panics if `address` is zero (all bytes zero).
pub fn require_non_zero_address(address: &Address) {
    validate_address(address).unwrap_or_else(|error| panic!("{:?}", error));
}

/// Panics if the value is zero.
pub fn require_non_zero_u32(value: u32, field: &str) {
    validate_enum_range(value, 1, u32::MAX).unwrap_or_else(|error| panic!("{}: {:?}", field, error));
}

/// Panics if the value is zero.
pub fn require_non_zero_u64(value: u64, field: &str) {
    if value == 0 { panic!("{}: {:?}", field, stellar_insured_lib::ValidationError::OutOfRange); }
}

/// Panics if the value is zero.
pub fn require_non_zero_u128(value: u128, field: &str) {
    if value == 0 { panic!("{}: {:?}", field, stellar_insured_lib::ValidationError::OutOfRange); }
}

/// Panics if the timestamp is not in the future.
pub fn require_future_timestamp(timestamp: u64, now: u64, field: &str) {
    validate_timestamp(timestamp, now).unwrap_or_else(|error| panic!("{}: {:?}", field, error));
}
