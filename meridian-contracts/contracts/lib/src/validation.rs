#![allow(clippy::result_large_err)]

use crate::ValidationError;

#[cfg(feature = "soroban")]
use soroban_sdk::{Address, Env, String};

#[cfg(feature = "soroban")]
use crate::emit_validation_failed;

#[cfg(feature = "soroban")]
pub fn validate_address(address: &Address) -> Result<(), ValidationError> {
    if address == &Address::from([0u8; 32]) {
        Err(ValidationError::ZeroAddress)
    } else {
        Ok(())
    }
}

#[cfg(feature = "ink")]
pub fn validate_address(address: &ink::primitives::AccountId) -> Result<(), ValidationError> {
    if address == &ink::primitives::AccountId::from([0u8; 32]) {
        Err(ValidationError::ZeroAddress)
    } else {
        Ok(())
    }
}

pub fn validate_amount(amount: i128) -> Result<(), ValidationError> {
    if amount <= 0 {
        Err(ValidationError::NonPositiveAmount)
    } else {
        Ok(())
    }
}

pub fn validate_timestamp(timestamp: u64, now: u64) -> Result<(), ValidationError> {
    if timestamp <= now {
        Err(ValidationError::InvalidTimestamp)
    } else {
        Ok(())
    }
}

#[cfg(feature = "ink")]
pub fn validate_string_length(value: &str, min: u32, max: u32) -> Result<(), ValidationError> {
    let length = value.len() as u32;
    if min > max || length < min || length > max {
        Err(ValidationError::InvalidStringLength)
    } else {
        Ok(())
    }
}

#[cfg(feature = "soroban")]
pub fn validate_string_length(value: &String, min: u32, max: u32) -> Result<(), ValidationError> {
    let length = value.len();
    if min > max || length < min || length > max {
        Err(ValidationError::InvalidStringLength)
    } else {
        Ok(())
    }
}

pub fn validate_enum_range(value: u32, min: u32, max: u32) -> Result<(), ValidationError> {
    if min > max || value < min || value > max {
        Err(ValidationError::InvalidEnumRange)
    } else {
        Ok(())
    }
}

pub fn validate_cross_field(condition: bool) -> Result<(), ValidationError> {
    if condition {
        Ok(())
    } else {
        Err(ValidationError::CrossFieldConstraint)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_invalid_boundaries_with_specific_errors() {
        assert_eq!(validate_amount(0), Err(ValidationError::NonPositiveAmount));
        assert_eq!(
            validate_timestamp(10, 10),
            Err(ValidationError::InvalidTimestamp)
        );
        assert_eq!(
            validate_enum_range(4, 0, 3),
            Err(ValidationError::InvalidEnumRange)
        );
        assert_eq!(
            validate_cross_field(false),
            Err(ValidationError::CrossFieldConstraint)
        );
    }
}

#[cfg(feature = "soroban")]
pub fn validate_or_emit<T>(
    env: &Env,
    result: Result<T, ValidationError>,
    field: &str,
) -> Result<T, ValidationError> {
    result.map_err(|error| {
        emit_validation_failed(env, error, soroban_sdk::Symbol::new(env, field));
        error
    })
}
