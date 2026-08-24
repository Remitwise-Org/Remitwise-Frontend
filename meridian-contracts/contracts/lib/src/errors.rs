#![no_std]

//! Strongly-typed error enums for Soroban smart contracts
//!
//! This module provides gas-efficient, auditable error handling using
//! Soroban's #[contracterror] attribute, replacing raw panic! calls
//! with structured error codes that surface properly to SDK/API clients.

#[cfg(feature = "soroban")]
use soroban_sdk::contracterror;

/// Escrow contract errors with explicit numeric codes
#[cfg(feature = "soroban")]
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum EscrowError {
    /// Contract has already been initialized
    AlreadyInitialized = 1,
    /// Caller is not authorized to perform this action
    Unauthorized = 2,
    /// Invalid nonce provided for replay protection
    InvalidNonce = 3,
    /// Number of participants exceeds maximum allowed
    TooManyParticipants = 4,
    /// Escrow not found
    EscrowNotFound = 5,
    /// Invalid escrow status for this operation
    InvalidStatus = 6,
    /// Deposit would exceed escrow amount
    DepositExceedsAmount = 7,
    /// Time lock is still active
    TimeLockActive = 8,
    /// Signature threshold not met for multi-sig approval
    SignatureThresholdNotMet = 9,
    /// Signer has already signed this approval
    AlreadySigned = 10,
}

/// Risk pool contract errors
#[cfg(feature = "soroban")]
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RiskPoolError {
    /// Contract has already been initialized
    AlreadyInitialized = 1,
    /// Contract not initialized properly
    NotInitialized = 2,
    /// Deposit amount below minimum stake requirement
    BelowMinimumStake = 3,
    /// Insufficient stake for withdrawal
    InsufficientStake = 4,
    /// Insufficient available capital in pool for operation
    InsufficientPoolFunds = 5,
    /// Amount must be greater than zero
    InvalidAmount = 6,
}

/// Governance contract errors
#[cfg(feature = "soroban")]
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum GovernanceError {
    /// Contract has already been initialized
    AlreadyInitialized = 1,
    /// Contract not initialized properly
    NotInitialized = 2,
    /// Voting period has ended for this proposal
    VotingPeriodEnded = 3,
    /// Address has already voted on this proposal
    AlreadyVoted = 4,
    /// Voting period has not yet ended
    VotingPeriodNotEnded = 5,
    /// Proposal must be finalized before execution
    MustFinalizeFirst = 6,
    /// Proposal has already been executed
    AlreadyExecuted = 7,
    /// Vote threshold not met for proposal execution
    ThresholdNotMet = 8,
    /// Claims contract address not configured
    ClaimsContractNotSet = 9,
    /// Risk pool contract address not configured
    RiskPoolContractNotSet = 10,
    /// Policy contract address not configured
    PolicyContractNotSet = 11,
    /// Slashing contract address not configured
    SlashingContractNotSet = 12,
    /// Pause duration must be greater than zero
    InvalidPauseDuration = 13,
}

/// Oracle contract errors (Soroban version)
///
/// Note: For ink! contracts, use the OracleError enum in the traits crate
#[cfg(feature = "soroban")]
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum OracleError {
    /// Contract has already been initialized
    AlreadyInitialized = 1,
    /// Contract not initialized properly
    NotInitialized = 2,
}

/// Common validation errors shared across contracts
#[cfg(feature = "soroban")]
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ValidationError {
    /// Zero address provided where non-zero expected
    ZeroAddress = 1,
    /// Amount must be positive
    NonPositiveAmount = 2,
    /// Invalid timestamp (e.g., in the past)
    InvalidTimestamp = 3,
    /// Invalid multi-signature configuration
    InvalidMultisigConfig = 4,
    /// Contract is paused
    ContractPaused = 5,
    /// Arithmetic overflow occurred
    Overflow = 6,
    /// Arithmetic underflow occurred
    Underflow = 7,
    /// Value is outside the permitted range
    OutOfRange = 8,
    /// Caller is not authorized
    Unauthorized = 9,
    /// Operation is invalid for the current state
    InvalidState = 10,
    /// Contract or required configuration is not initialized
    NotInitialized = 11,
    /// String length is outside the permitted range
    InvalidStringLength = 12,
    /// Enum discriminant is outside the permitted range
    InvalidEnumRange = 13,
    /// Cross-field constraint failed
    CrossFieldConstraint = 14,
}

#[cfg(feature = "ink")]
#[derive(Copy, Clone, Debug, Eq, PartialEq, scale::Encode, scale::Decode)]
pub enum ValidationError {
    ZeroAddress,
    NonPositiveAmount,
    InvalidTimestamp,
    InvalidMultisigConfig,
    ContractPaused,
    Overflow,
    Underflow,
    OutOfRange,
    Unauthorized,
    InvalidState,
    NotInitialized,
    InvalidStringLength,
    InvalidEnumRange,
    CrossFieldConstraint,
}
