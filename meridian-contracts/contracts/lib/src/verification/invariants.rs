/// Shared contract invariants expressed as pure Rust functions.
///
/// These functions contain no Soroban SDK dependencies and can be verified
/// with formal verification tools like kani or prusti-contracts. They model
/// the mathematical properties that must always hold in the contract state.
///
/// # Invariants
///
/// - **Non-negative balances**: `balance >= 0` for all accounts
/// - **Monotonic counters**: counters only increase, never decrease
/// - **Auth checks**: privileged operations require valid authorization
/// - **Conservation laws**: total supply equals sum of individual balances
/// - **Threshold monotonicity**: higher thresholds require proportionally more votes

// Re-export core types for verification
pub type Amount = i128;
pub type Count = u64;
pub type Weight = i128;

/// Invariant: A balance must never be negative.
///
/// # Contract coverage
/// - risk_pool: `available_capital`, `total_capital`, `provider_stake`
/// - claims: `claim.amount`, `policy.total_claimed`
/// - escrow: `deposited_amount`
/// - fees: `fee_treasury`, `pending_rewards`
#[inline]
pub fn non_negative_balance(balance: Amount) -> bool {
    balance >= 0
}

/// Invariant: Sum of individual balances must not exceed total supply.
///
/// # Contract coverage
/// - risk_pool: sum of provider stakes == total_capital
/// - property-token: sum of token balances == total_supply
/// - escrow: sum of escrow deposited_amounts == contract balance
#[inline]
pub fn conservation_law(total_supply: Amount, sum_of_parts: Amount) -> bool {
    sum_of_parts <= total_supply
}

/// Invariant: A monotonically increasing counter must never decrease.
///
/// # Contract coverage
/// - claims: `ClaimCounter`
/// - policy: `PolicyCounter`
/// - governance: `ProposalCounter`
/// - escrow: `EscrowCount`
/// - insurance: `claim_count`, `policy_count`, `pool_count`
#[inline]
pub fn monotonic_counter(old_value: Count, new_value: Count) -> bool {
    new_value >= old_value
}

/// Invariant: Claim amount must not exceed remaining coverage.
///
/// `policy.total_claimed + new_claim.amount <= policy.coverage_amount`
///
/// # Contract coverage
/// - claims: `submit_claim` validation
/// - policy: `update_claimed` guard
#[inline]
pub fn claim_within_coverage(
    total_claimed: Amount,
    claim_amount: Amount,
    coverage: Amount,
) -> bool {
    claim_amount > 0 && total_claimed + claim_amount <= coverage
}

/// Invariant: Withdrawal amount must not exceed available capital.
///
/// # Contract coverage
/// - risk_pool: `withdraw_liquidity`
/// - risk_pool: `payout_claim`
#[inline]
pub fn withdrawal_within_available(withdrawal: Amount, available: Amount) -> bool {
    withdrawal > 0 && withdrawal <= available
}

/// Invariant: Withdrawal amount must not exceed staked balance.
///
/// # Contract coverage
/// - risk_pool: `withdraw_liquidity`
/// - slashing: `slash_funds` stake check
#[inline]
pub fn withdrawal_within_stake(withdrawal: Amount, stake: Amount) -> bool {
    withdrawal > 0 && withdrawal <= stake
}

/// Invariant: Pool available capital must never be negative.
///
/// # Contract coverage
/// - risk_pool: `available_capital >= 0`
#[inline]
pub fn non_negative_available_capital(available: Amount) -> bool {
    available >= 0
}

/// Invariant: Total capital must be at least available capital.
///
/// # Contract coverage
/// - risk_pool: `total_capital >= available_capital`
#[inline]
pub fn total_capital_covers_available(total: Amount, available: Amount) -> bool {
    total >= available
}

/// Invariant: Deposit/withdraw round-trip preserves total capital.
///
/// After a deposit of `d` followed by a withdrawal of `w` (where `w <= d`),
/// the total capital must be `original + d - w`.
///
/// # Contract coverage
/// - risk_pool: `deposit_liquidity` / `withdraw_liquidity`
#[inline]
pub fn deposit_withdraw_roundtrip(
    original: Amount,
    deposit: Amount,
    withdrawal: Amount,
    final_total: Amount,
) -> bool {
    let expected = original + deposit - withdrawal;
    expected == final_total
}

/// Invariant: Yes votes plus no votes must equal total weight cast.
///
/// # Contract coverage
/// - governance: `Proposal.yes_votes + no_votes == total_weight`
#[inline]
pub fn vote_sum_equals_total_weight(
    yes_votes: Weight,
    no_votes: Weight,
    total_weight: Weight,
) -> bool {
    yes_votes + no_votes == total_weight
}

/// Invariant: Threshold logic is monotonic.
///
/// If `threshold` increases, the set of proposals that pass must shrink
/// (or stay the same). A higher threshold cannot cause a previously failing
/// proposal to pass.
///
/// # Contract coverage
/// - governance: `execute_proposal` threshold check
#[inline]
pub fn threshold_monotonic(
    yes_votes: Weight,
    total_votes: Weight,
    threshold_old: u32,
    threshold_new: u32,
) -> bool {
    if threshold_new <= threshold_old {
        return true;
    }
    let passes_old = total_votes > 0 && (yes_votes * 100 / total_votes) >= threshold_old as i128;
    let passes_new = total_votes > 0 && (yes_votes * 100 / total_votes) >= threshold_new as i128;
    !passes_new || passes_old
}

/// Invariant: A nonce must be monotonically increasing per caller.
///
/// # Contract coverage
/// - escrow: `nonce == current_nonce + 1`
#[inline]
pub fn monotonic_nonce(current_nonce: Count, supplied_nonce: Count) -> bool {
    supplied_nonce == current_nonce + 1
}

/// Invariant: Signature count must not exceed number of unique signers.
///
/// # Contract coverage
/// - escrow: `SigCount <= signers.len()`
#[inline]
pub fn sig_count_within_signers(sig_count: u32, signer_count: usize) -> bool {
    sig_count as usize <= signer_count
}

/// Invariant: Premium amount must be non-negative.
///
/// # Contract coverage
/// - policy: `premium_amount >= 0`
/// - insurance: `min_premium_amount`
#[inline]
pub fn non_negative_premium(premium: Amount) -> bool {
    premium >= 0
}

/// Invariant: Coverage amount must be non-negative.
///
/// # Contract coverage
/// - policy: `coverage_amount >= 0`
/// - claims: `claim.amount <= coverage_amount`
#[inline]
pub fn non_negative_coverage(coverage: Amount) -> bool {
    coverage >= 0
}

/// Invariant: Time-lock must be in the future.
///
/// # Contract coverage
/// - escrow: `release_time_lock > current_timestamp`
#[inline]
pub fn future_time_lock(lock_time: u64, current_time: u64) -> bool {
    lock_time > current_time
}

/// Invariant: Distribution rates must not exceed 100%.
///
/// # Contract coverage
/// - fees: `validator_share_bp + treasury_share_bp <= 10_000`
#[inline]
pub fn distribution_rates_within_bounds(validator_bp: u32, treasury_bp: u32) -> bool {
    validator_bp.saturating_add(treasury_bp) <= 10_000
}

/// Invariant: Reputation must be within 0-1000 range.
///
/// # Contract coverage
/// - oracle: `source_reputations` clamped to 0-1000
#[inline]
pub fn reputation_in_bounds(reputation: u32) -> bool {
    reputation <= 1000
}

/// Invariant: Minimum fee must not exceed maximum fee.
///
/// # Contract coverage
/// - fees: `min_fee <= max_fee`
#[inline]
pub fn fee_bounds_valid(min_fee: Amount, max_fee: Amount) -> bool {
    min_fee <= max_fee
}

/// Invariant: Base fee must be within configured bounds.
///
/// # Contract coverage
/// - fees: `min_fee <= base_fee <= max_fee`
#[inline]
pub fn base_fee_within_bounds(base_fee: Amount, min_fee: Amount, max_fee: Amount) -> bool {
    min_fee <= base_fee && base_fee <= max_fee
}

/// Invariant: History length must not exceed the configured maximum.
///
/// # Contract coverage
/// - slashing: `history.len() <= MAX_HISTORY`
#[inline]
pub fn history_within_max(len: usize, max: usize) -> bool {
    len <= max
}
