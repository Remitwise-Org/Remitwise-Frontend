use stellar_insured_lib::{validate_amount, validate_cross_field, validate_enum_range, ValidationError};

pub fn validate_fee(amount: i128) -> Result<(), ValidationError> { validate_amount(amount) }
pub fn validate_rate(rate: u32) -> Result<(), ValidationError> { validate_enum_range(rate, 0, 10_000) }
pub fn validate_fee_bounds(minimum: u128, maximum: u128) -> Result<(), ValidationError> {
    validate_cross_field(minimum <= maximum)
}
