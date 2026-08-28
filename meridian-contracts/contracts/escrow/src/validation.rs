use soroban_sdk::{Address, Env};
use stellar_insured_lib::{validate_address, validate_amount, validate_timestamp, ValidationError};

/// Checks if the contract is paused and returns an error if so.
///
/// Always pass `&Env` (by reference) to avoid unnecessary clones — `Env` is
/// cheap to clone but passing by reference is the idiomatic pattern for
/// helper/validation functions that do not need ownership (#353).
pub fn require_not_paused(env: &Env) -> Result<(), ValidationError> {
    if stellar_insured_lib::circuit_breaker::is_paused(env) {
        return Err(ValidationError::ContractPaused);
    }
    Ok(())
}

/// Checks if `address` is zero (all bytes zero) and returns an error if so.
pub fn require_non_zero_address(_address: &Address) -> Result<(), ValidationError> {
    validate_address(_address)
}

/// Checks if the identifier is zero and returns an error if so.
pub fn require_non_zero_u64(value: u64, _field: &str) -> Result<(), ValidationError> {
    if value == 0 {
        return Err(ValidationError::NonPositiveAmount);
    }
    Ok(())
}

/// Checks if the amount is zero or negative and returns an error if so.
pub fn require_positive_amount(amount: i128, _field: &str) -> Result<(), ValidationError> {
    validate_amount(amount)
}

/// Checks if `timestamp` is in the past or present relative to `now`.
pub fn require_future_timestamp(
    timestamp: u64,
    now: u64,
    _field: &str,
) -> Result<(), ValidationError> {
    validate_timestamp(timestamp, now)
}

/// Checks if `required_signatures` is zero, `participants` is empty,
/// or `required_signatures` exceeds the number of participants.
pub fn require_valid_multisig(
    required_signatures: u32,
    participant_count: u32,
) -> Result<(), ValidationError> {
    if required_signatures == 0 || participant_count == 0 || required_signatures > participant_count
    {
        return Err(ValidationError::InvalidMultisigConfig);
    }
    Ok(())
}
