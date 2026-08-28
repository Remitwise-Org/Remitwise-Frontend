use stellar_insured_lib::{validate_address, validate_amount, validate_enum_range, ValidationError};
use ink::primitives::AccountId;

pub fn validate_owner(owner: &AccountId) -> Result<(), ValidationError> { validate_address(owner) }
pub fn validate_token_amount(amount: i128) -> Result<(), ValidationError> { validate_amount(amount) }
pub fn validate_chain(chain: u32) -> Result<(), ValidationError> { validate_enum_range(chain, 1, u32::MAX) }
