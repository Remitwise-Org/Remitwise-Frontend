use stellar_insured_lib::{validate_amount, validate_enum_range, validate_string_length, ValidationError};

pub fn validate_valuation(amount: i128) -> Result<(), ValidationError> { validate_amount(amount) }
pub fn validate_source_name(name: &str) -> Result<(), ValidationError> { validate_string_length(name, 1, 128) }
pub fn validate_confidence(value: u32) -> Result<(), ValidationError> { validate_enum_range(value, 0, 10_000) }
