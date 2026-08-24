use ink::prelude::{string::String, vec::Vec};
use ink::primitives::AccountId;

/// Fixed-point precision for [`RiskPool::accumulated_reward_per_share`] (1e18).
pub const REWARD_PRECISION: u128 = 1_000_000_000_000_000_000;

#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum InsuranceError {
    Unauthorized,
    PolicyNotFound,
    ClaimNotFound,
    PoolNotFound,
    PolicyAlreadyActive,
    PolicyExpired,
    PolicyInactive,
    InsufficientPremium,
    InsufficientPoolFunds,
    ClaimAlreadyProcessed,
    ClaimExceedsCoverage,
    InvalidParameters,
    OracleVerificationFailed,
    ReinsuranceCapacityExceeded,
    TokenNotFound,
    TransferFailed,
    CooldownPeriodActive,
    PropertyNotInsurable,
    DuplicateClaim,
    InvalidEvidenceUri,
    InvalidEvidenceHash,
    InvalidEvidenceNonce,
    DisputeWindowExpired,
    InvalidDisputeTransition,
    ContractPaused,
    NonceAlreadyUsed,
    PremiumTooLow,
    EvidenceNonceEmpty,
    EvidenceInvalidUriScheme,
    EvidenceInvalidHashLength,
    ZeroAmount,
    InsufficientStake,
    InsufficientPoolLiquidity,
    TimeLockPending,
    TimeLockNotReady,
}

#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum PolicyStatus {
    Active,
    Renewed,
    Expired,
    Cancelled,
    Claimed,
    Suspended,
}

#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum PolicyType {
    Standard,
    Parametric,
}

#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum CoverageType {
    Fire,
    Flood,
    Earthquake,
    Theft,
    LiabilityDamage,
    NaturalDisaster,
    Comprehensive,
}

#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum ClaimStatus {
    Pending,
    UnderReview,
    OracleVerifying,
    Approved,
    Rejected,
    Paid,
    Disputed,
}

#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum RiskLevel {
    VeryLow,
    Low,
    Medium,
    High,
    VeryHigh,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct EvidenceMetadata {
    pub evidence_type: String,
    pub reference_uri: String,
    pub content_hash: Vec<u8>,
    pub description: Option<String>,
}

impl From<&str> for EvidenceMetadata {
    fn from(s: &str) -> Self {
        EvidenceMetadata {
            evidence_type: "unknown".into(),
            reference_uri: s.into(),
            content_hash: vec![0u8; 32],
            description: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct EvidenceItem {
    pub id: u64,
    pub claim_id: u64,
    pub evidence_type: String,
    pub ipfs_hash: String,
    pub ipfs_uri: String,
    pub content_hash: Vec<u8>,
    pub file_size: u64,
    pub submitter: AccountId,
    pub submitted_at: u64,
    pub verified: bool,
    pub verified_by: Option<AccountId>,
    pub verified_at: Option<u64>,
    pub verification_notes: Option<String>,
    pub metadata_url: Option<String>,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct EvidenceVerification {
    pub evidence_id: u64,
    pub verifier: AccountId,
    pub verified_at: u64,
    pub is_valid: bool,
    pub notes: String,
    pub ipfs_accessible: bool,
    pub hash_matches: bool,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct InsurancePolicy {
    pub policy_id: u64,
    pub property_id: u64,
    pub policyholder: AccountId,
    pub coverage_type: CoverageType,
    pub coverage_amount: u128,
    pub premium_amount: u128,
    pub deductible: u128,
    pub start_time: u64,
    pub end_time: u64,
    pub status: PolicyStatus,
    pub risk_level: RiskLevel,
    pub pool_id: u64,
    pub claims_count: u32,
    pub total_claimed: u128,
    pub metadata_url: String,
    pub policy_type: PolicyType,
    pub event_id: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct InsuranceClaim {
    pub claim_id: u64,
    pub policy_id: u64,
    pub claimant: AccountId,
    pub claim_amount: u128,
    pub description: String,
    pub evidence: EvidenceMetadata,
    pub evidence_ids: Vec<u64>,
    pub oracle_report_url: String,
    pub status: ClaimStatus,
    pub submitted_at: u64,
    pub processed_at: Option<u64>,
    pub payout_amount: u128,
    pub assessor: Option<AccountId>,
    pub rejection_reason: String,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct RiskPool {
    pub pool_id: u64,
    pub name: String,
    pub coverage_type: CoverageType,
    pub total_capital: u128,
    pub available_capital: u128,
    pub total_premiums_collected: u128,
    pub total_claims_paid: u128,
    pub active_policies: u64,
    pub max_coverage_ratio: u32,
    pub reinsurance_threshold: u128,
    pub created_at: u64,
    pub is_active: bool,
    pub total_provider_stake: u128,
    pub accumulated_reward_per_share: u128,
    pub vesting_cliff_seconds: u64,
    pub vesting_duration_seconds: u64,
    pub early_withdrawal_penalty_bps: u32,
}

/// Holds the result of a property risk assessment.
///
/// # Score Semantics (higher score = lower risk)
///
/// Every score field in this struct represents property **quality** on a 0–100
/// scale, where higher values are *better*:
///
/// | Score Range | Meaning                        |
/// |-------------|-------------------------------|
/// | 0–20        | Poor — very high risk          |
/// | 21–40       | Below average — high risk      |
/// | 41–60       | Average — medium risk          |
/// | 61–80       | Good — low risk                |
/// | 81–100      | Excellent — very low risk      |
///
/// The [`overall_risk_score`] is the average of the four sub-scores and is
/// converted to a [`RiskLevel`] by
/// [`PropertyInsurance::confidence_score_to_risk_level`].
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct RiskAssessment {
    pub property_id: u64,
    pub location_risk_score: u32,
    pub construction_risk_score: u32,
    pub age_risk_score: u32,
    pub claims_history_score: u32,
    pub overall_risk_score: u32,
    pub risk_level: RiskLevel,
    pub assessed_at: u64,
    pub valid_until: u64,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct PremiumCalculation {
    pub base_rate: u32,
    pub risk_multiplier: u32,
    pub coverage_multiplier: u32,
    pub annual_premium: u128,
    pub monthly_premium: u128,
    pub deductible: u128,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct ReinsuranceAgreement {
    pub agreement_id: u64,
    pub reinsurer: AccountId,
    pub coverage_limit: u128,
    pub retention_limit: u128,
    pub premium_ceded_rate: u32,
    pub coverage_types: Vec<CoverageType>,
    pub start_time: u64,
    pub end_time: u64,
    pub is_active: bool,
    pub total_ceded_premiums: u128,
    pub total_recoveries: u128,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct InsuranceToken {
    pub token_id: u64,
    pub policy_id: u64,
    pub owner: AccountId,
    pub face_value: u128,
    pub is_tradeable: bool,
    pub created_at: u64,
    pub listed_price: Option<u128>,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct ActuarialModel {
    pub model_id: u64,
    pub coverage_type: CoverageType,
    pub loss_frequency: u32,
    pub average_loss_severity: u128,
    pub expected_loss_ratio: u32,
    pub confidence_level: u32,
    pub last_updated: u64,
    pub data_points: u32,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct UnderwritingCriteria {
    pub max_property_age_years: u32,
    pub min_property_value: u128,
    pub max_property_value: u128,
    pub excluded_locations: Vec<String>,
    pub required_safety_features: bool,
    pub max_previous_claims: u32,
    pub min_risk_score: u32,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct BatchClaimResult {
    pub claim_id: u64,
    pub success: bool,
    pub error: Option<InsuranceError>,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct BatchClaimSummary {
    pub total_processed: u64,
    pub successful: u64,
    pub failed: u64,
    pub results: Vec<BatchClaimResult>,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct PoolLiquidityProvider {
    pub provider: AccountId,
    pub pool_id: u64,
    pub provider_stake: u128,
    pub reward_debt: u128,
    pub deposited_at: u64,
    pub vesting_total: u128,
    pub vesting_claimed: u128,
    pub vesting_start: u64,
}
