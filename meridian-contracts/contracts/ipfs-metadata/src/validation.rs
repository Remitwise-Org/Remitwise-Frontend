use stellar_insured_lib::{validate_string_length, ValidationError};

pub fn validate_cid(cid: &str) -> Result<(), ValidationError> { validate_string_length(cid, 1, 256) }
pub fn validate_metadata(value: &str) -> Result<(), ValidationError> { validate_string_length(value, 1, 65_536) }
