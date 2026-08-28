// This file is included inside the `propchain_insurance` ink::contract module.
// All types referenced here are in scope via the parent module's `use` statements.

#[ink(event)]
pub struct PolicyCreated {
    #[ink(topic)]
    pub policy_id: u64,
    #[ink(topic)]
    pub policyholder: AccountId,
    #[ink(topic)]
    pub property_id: u64,
    pub coverage_type: CoverageType,
    pub coverage_amount: u128,
    pub premium_amount: u128,
    pub start_time: u64,
    pub end_time: u64,
}

#[ink(event)]
pub struct PolicyIssued {
    #[ink(topic)]
    pub policy_id: u64,
    #[ink(topic)]
    pub holder: AccountId,
    pub coverage_amount: u128,
    pub premium_amount: u128,
    pub timestamp: u64,
}

#[ink(event)]
pub struct PolicyCancelled {
    #[ink(topic)]
    pub policy_id: u64,
    #[ink(topic)]
    pub policyholder: AccountId,
    pub cancelled_at: u64,
    pub reason: Option<String>,
}

#[ink(event)]
pub struct PolicyRenewed {
    #[ink(topic)]
    pub policy_id: u64,
    #[ink(topic)]
    pub holder: AccountId,
    pub renewal_premium: u128,
    pub new_end_time: u64,
    pub timestamp: u64,
}

#[ink(event)]
pub struct PolicyExpired {
    #[ink(topic)]
    pub policy_id: u64,
    #[ink(topic)]
    pub holder: AccountId,
    pub timestamp: u64,
}

#[ink(event)]
pub struct ClaimSubmitted {
    #[ink(topic)]
    pub claim_id: u64,
    #[ink(topic)]
    pub policy_id: u64,
    #[ink(topic)]
    pub claimant: AccountId,
    pub claim_amount: u128,
    pub submitted_at: u64,
}

#[ink(event)]
pub struct ClaimApproved {
    #[ink(topic)]
    pub claim_id: u64,
    #[ink(topic)]
    pub policy_id: u64,
    pub payout_amount: u128,
    pub approved_by: AccountId,
    pub timestamp: u64,
}

#[ink(event)]
pub struct ClaimRejected {
    #[ink(topic)]
    pub claim_id: u64,
    #[ink(topic)]
    pub policy_id: u64,
    pub reason: String,
    pub rejected_by: AccountId,
    pub timestamp: u64,
}

#[ink(event)]
pub struct PayoutExecuted {
    #[ink(topic)]
    pub claim_id: u64,
    #[ink(topic)]
    pub recipient: AccountId,
    pub amount: u128,
    pub timestamp: u64,
}

#[ink(event)]
pub struct PoolCapitalized {
    #[ink(topic)]
    pub pool_id: u64,
    #[ink(topic)]
    pub provider: AccountId,
    pub amount: u128,
    pub timestamp: u64,
}

#[ink(event)]
pub struct LiquidityDeposited {
    #[ink(topic)]
    pub pool_id: u64,
    #[ink(topic)]
    pub provider: AccountId,
    pub amount: u128,
    pub accumulated_reward_per_share: u128,
    pub timestamp: u64,
}

#[ink(event)]
pub struct LiquidityWithdrawn {
    #[ink(topic)]
    pub pool_id: u64,
    #[ink(topic)]
    pub provider: AccountId,
    pub principal: u128,
    pub rewards_paid: u128,
    pub accumulated_reward_per_share: u128,
    pub timestamp: u64,
}

#[ink(event)]
pub struct RewardsClaimed {
    #[ink(topic)]
    pub pool_id: u64,
    #[ink(topic)]
    pub provider: AccountId,
    pub amount: u128,
    pub accumulated_reward_per_share: u128,
    pub timestamp: u64,
}

#[ink(event)]
pub struct RewardsReinvested {
    #[ink(topic)]
    pub pool_id: u64,
    #[ink(topic)]
    pub provider: AccountId,
    pub amount: u128,
    pub new_stake: u128,
    pub accumulated_reward_per_share: u128,
    pub timestamp: u64,
}

#[ink(event)]
pub struct RewardsVestingStarted {
    #[ink(topic)]
    pub pool_id: u64,
    #[ink(topic)]
    pub provider: AccountId,
    pub amount: u128,
    pub vesting_start: u64,
    pub vesting_cliff: u64,
    pub vesting_duration: u64,
}

#[ink(event)]
pub struct VestedRewardsClaimed {
    #[ink(topic)]
    pub pool_id: u64,
    #[ink(topic)]
    pub provider: AccountId,
    pub amount: u128,
    pub timestamp: u64,
}

#[ink(event)]
pub struct ReinsuranceActivated {
    #[ink(topic)]
    pub claim_id: u64,
    pub agreement_id: u64,
    pub recovery_amount: u128,
    pub timestamp: u64,
}

#[ink(event)]
pub struct InsuranceTokenMinted {
    #[ink(topic)]
    pub token_id: u64,
    #[ink(topic)]
    pub policy_id: u64,
    #[ink(topic)]
    pub owner: AccountId,
    pub face_value: u128,
}

#[ink(event)]
pub struct InsuranceTokenTransferred {
    #[ink(topic)]
    pub token_id: u64,
    #[ink(topic)]
    pub from: AccountId,
    #[ink(topic)]
    pub to: AccountId,
    pub price: u128,
}

#[ink(event)]
pub struct RiskAssessmentUpdated {
    #[ink(topic)]
    pub property_id: u64,
    pub overall_score: u32,
    pub risk_level: RiskLevel,
    pub timestamp: u64,
}

#[ink(event)]
pub struct ClaimDisputed {
    #[ink(topic)]
    pub claim_id: u64,
    #[ink(topic)]
    pub raised_by: AccountId,
    pub dispute_deadline: u64,
    pub previous_status: ClaimStatus,
    pub timestamp: u64,
}

#[ink(event)]
pub struct EvidenceSubmitted {
    #[ink(topic)]
    pub evidence_id: u64,
    #[ink(topic)]
    pub claim_id: u64,
    pub evidence_type: String,
    pub ipfs_hash: String,
    pub submitter: AccountId,
    pub submitted_at: u64,
}

#[ink(event)]
pub struct EvidenceVerified {
    #[ink(topic)]
    pub evidence_id: u64,
    pub verified_by: AccountId,
    pub is_valid: bool,
    pub verified_at: u64,
}

#[ink(event)]
pub struct PauseScheduled {
    #[ink(topic)]
    pub scheduled_by: AccountId,
    pub scheduled_at: u64,
    pub activates_at: u64,
    pub pause_until: Option<u64>,
    pub rescheduled_by: Option<AccountId>,
}

#[ink(event)]
pub struct PauseActivated {
    pub activated_at: u64,
    pub pause_until: Option<u64>,
    pub emergency: bool,
}

#[ink(event)]
pub struct ResumeScheduled {
    #[ink(topic)]
    pub scheduled_by: AccountId,
    pub scheduled_at: u64,
    pub activates_at: u64,
}

#[ink(event)]
pub struct ResumeActivated {
    #[ink(topic)]
    pub activated_by: Option<AccountId>,
    pub activated_at: u64,
    pub automatic: bool,
}

#[ink(event)]
pub struct AdminProposed {
    #[ink(topic)]
    pub proposed_by: AccountId,
    #[ink(topic)]
    pub new_admin: AccountId,
    pub earliest_execution: u64,
}

#[ink(event)]
pub struct AdminChanged {
    #[ink(topic)]
    pub old_admin: AccountId,
    #[ink(topic)]
    pub new_admin: AccountId,
    pub timestamp: u64,
}
