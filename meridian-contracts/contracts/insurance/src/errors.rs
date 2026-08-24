use ink::prelude::string::String;

/// Top-level contract error type returned by all public functions.
///
/// Replaces ad-hoc panics so callers can pattern-match on failure causes.
#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum ContractError {
    /// Caller is not authorised to perform the action.
    Unauthorized,
    /// The requested resource does not exist in storage.
    NotFound,
    /// Supplied argument is outside the accepted range.
    InvalidInput(String),
    /// Contract is paused and rejects state-changing calls.
    ContractPaused,
    /// An arithmetic operation would overflow or underflow.
    ArithmeticError,
    /// The operation violates a business-logic invariant.
    InvalidState,
}

/// Convenience alias used as the return type of every public function.
pub type ContractResult<T> = Result<T, ContractError>;
