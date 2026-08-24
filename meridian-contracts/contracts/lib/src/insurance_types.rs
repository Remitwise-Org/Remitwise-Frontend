use soroban_sdk::{contracttype, Address, String, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PolicyStatus {
    Active,
    Renewed,
    Expired,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PolicyType {
    Standard,
    Parametric,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InsurancePolicy {
    pub policy_id: u64,
    pub holder: Address,
    pub coverage_amount: i128,
    pub premium_amount: i128,
    pub start_time: u64,
    pub duration_days: u32,
    pub policy_type: PolicyType,
    pub status: PolicyStatus,
    pub risk_pool: Address,
    pub total_claimed: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ClaimStatus {
    Submitted,
    UnderReview,
    Approved,
    Rejected,
    Settled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InsuranceClaim {
    pub claim_id: u64,
    pub policy_id: u64,
    pub claimant: Address,
    pub amount: i128,
    pub status: ClaimStatus,
    pub submitted_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolStats {
    pub total_capital: i128,
    pub available_capital: i128,
    pub total_claims_paid: i128,
    pub provider_count: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proposal {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub execution_data: String,
    pub creator: Address,
    pub expires_at: u64,
    pub threshold_percentage: u32,
    pub yes_votes: i128,
    pub no_votes: i128,
    pub is_finalized: bool,
    pub is_executed: bool,
}

// #411: Add governance action types for DAO integration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum GovernanceAction {
    ClaimApproval(u64),              // claim_id
    FundAllocation(Address, i128),   // recipient, amount
    PolicyChange(u64, PolicyPatch),  // policy_id, patch (#609)
    Slashing(Address, Symbol, i128), // target, role, amount (#601)
    PauseContract(Address, u64),     // target contract, duration in seconds
}

// #609: `Option<PolicyStatus>` isn't supported by soroban-sdk's ScVal/XDR
// codegen for custom enums, so "leave status unchanged" needs its own
// wrapper enum instead of `Option`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StatusPatch {
    Keep,
    Set(PolicyStatus),
}

// #609: DAO-controlled policy parameter changes.
//
// `None` on `coverage_amount`/`premium_amount` means "leave unchanged" so a
// proposal can patch just one attribute without clobbering the rest.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolicyPatch {
    pub coverage_amount: Option<i128>,
    pub premium_amount: Option<i128>,
    pub status: StatusPatch,
}

/// #609: DAO-governed global parameters that constrain new policies.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolicyParams {
    pub max_coverage_amount: i128,
    pub min_premium_amount: i128,
}
