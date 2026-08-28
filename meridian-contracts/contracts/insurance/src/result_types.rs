use crate::propchain_insurance::InsuranceError;

/// Convenience alias so every public function returns a consistent Result type.
pub type InsuranceResult<T> = Result<T, InsuranceError>;

/// Wraps a value in Ok, making call sites easier to read.
#[inline]
pub fn ok<T>(val: T) -> InsuranceResult<T> {
    Ok(val)
}

/// Returns a typed Err, centralising error construction.
#[inline]
pub fn err<T>(e: InsuranceError) -> InsuranceResult<T> {
    Err(e)
}

/// Guard that returns Err(Unauthorized) when the condition is false.
#[inline]
pub fn require_auth(condition: bool) -> InsuranceResult<()> {
    if condition {
        Ok(())
    } else {
        Err(InsuranceError::Unauthorized)
    }
}

/// Guard that returns Err(InvalidParameters) when the condition is false.
#[inline]
pub fn require(condition: bool) -> InsuranceResult<()> {
    if condition {
        Ok(())
    } else {
        Err(InsuranceError::InvalidParameters)
    }
}
