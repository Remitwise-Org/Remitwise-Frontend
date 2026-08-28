use stellar_insured_lib::{validate_address, validate_enum_range, ValidationError};
use ink::primitives::AccountId;

pub fn validate_account(account: &AccountId) -> Result<(), ValidationError> { validate_address(account) }
pub fn validate_proof_type(value: u32) -> Result<(), ValidationError> { validate_enum_range(value, 0, 255) }
