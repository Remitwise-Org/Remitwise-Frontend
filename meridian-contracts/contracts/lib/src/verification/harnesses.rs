/// Kani verification harnesses for contract invariants.
///
/// These harnesses use kani's model checking to exhaustively verify that
/// the pure invariant functions in `invariants.rs` hold for all possible
/// inputs within the specified bounds.
///
/// To run: `cargo kani --features verification`
///
/// # Running formal verification
///
/// ```bash
/// cd meridian-contracts/contracts/lib
/// cargo kani --features verification
/// ```
#[cfg(feature = "verification")]
#[cfg(test)]
mod harnesses {
    use super::invariants::*;
    use kani::proof;

    /// Verify that non_negative_balance holds for all i128 values.
    ///
    /// Property: for any `balance >= 0`, `non_negative_balance(balance)` is true.
    #[proof]
    fn verify_non_negative_balance() {
        let balance: i128 = kani::any();
        kani::assume(balance >= 0);
        assert!(non_negative_balance(balance));
    }

    /// Verify that non_negative_balance rejects negative values.
    #[proof]
    fn verify_non_negative_balance_rejects_negative() {
        let balance: i128 = kani::any();
        kani::assume(balance < 0);
        assert!(!non_negative_balance(balance));
    }

    /// Verify conservation law: sum_of_parts <= total_supply.
    #[proof]
    fn verify_conservation_law() {
        let total: i128 = kani::any();
        let sum: i128 = kani::any();
        kani::assume(total >= 0);
        kani::assume(sum >= 0);
        assert!(conservation_law(total, sum));
    }

    /// Verify monotonic counter never decreases.
    #[proof]
    fn verify_monotonic_counter() {
        let old_val: u64 = kani::any();
        let new_val: u64 = kani::any();
        kani::assume(new_val >= old_val);
        assert!(monotonic_counter(old_val, new_val));
    }

    /// Verify monotonic counter rejects decreasing values.
    #[proof]
    fn verify_monotonic_counter_rejects_decrease() {
        let old_val: u64 = kani::any();
        let new_val: u64 = kani::any();
        kani::assume(new_val < old_val);
        assert!(!monotonic_counter(old_val, new_val));
    }

    /// Verify claim_within_coverage for valid inputs.
    #[proof]
    fn verify_claim_within_coverage() {
        let total_claimed: i128 = kani::any();
        let claim_amount: i128 = kani::any();
        let coverage: i128 = kani::any();
        kani::assume(total_claimed >= 0);
        kani::assume(claim_amount > 0);
        kani::assume(coverage >= 0);
        kani::assume(total_claimed + claim_amount <= coverage);
        assert!(claim_within_coverage(total_claimed, claim_amount, coverage));
    }

    /// Verify claim_within_coverage rejects over-coverage claims.
    #[proof]
    fn verify_claim_within_coverage_rejects_excess() {
        let total_claimed: i128 = kani::any();
        let claim_amount: i128 = kani::any();
        let coverage: i128 = kani::any();
        kani::assume(total_claimed >= 0);
        kani::assume(claim_amount > 0);
        kani::assume(coverage >= 0);
        kani::assume(total_claimed + claim_amount > coverage);
        assert!(!claim_within_coverage(
            total_claimed,
            claim_amount,
            coverage
        ));
    }

    /// Verify claim_within_coverage rejects non-positive amounts.
    #[proof]
    fn verify_claim_within_coverage_rejects_non_positive() {
        let total_claimed: i128 = kani::any();
        let claim_amount: i128 = kani::any();
        let coverage: i128 = kani::any();
        kani::assume(total_claimed >= 0);
        kani::assume(claim_amount <= 0);
        kani::assume(coverage >= 0);
        assert!(!claim_within_coverage(
            total_claimed,
            claim_amount,
            coverage
        ));
    }

    /// Verify withdrawal_within_available for valid inputs.
    #[proof]
    fn verify_withdrawal_within_available() {
        let withdrawal: i128 = kani::any();
        let available: i128 = kani::any();
        kani::assume(withdrawal > 0);
        kani::assume(available >= 0);
        kani::assume(withdrawal <= available);
        assert!(withdrawal_within_available(withdrawal, available));
    }

    /// Verify withdrawal_within_available rejects over-withdrawal.
    #[proof]
    fn verify_withdrawal_within_available_rejects_excess() {
        let withdrawal: i128 = kani::any();
        let available: i128 = kani::any();
        kani::assume(withdrawal > 0);
        kani::assume(available >= 0);
        kani::assume(withdrawal > available);
        assert!(!withdrawal_within_available(withdrawal, available));
    }

    /// Verify non_negative_available_capital.
    #[proof]
    fn verify_non_negative_available_capital() {
        let available: i128 = kani::any();
        kani::assume(available >= 0);
        assert!(non_negative_available_capital(available));
    }

    /// Verify total_capital_covers_available.
    #[proof]
    fn verify_total_capital_covers_available() {
        let total: i128 = kani::any();
        let available: i128 = kani::any();
        kani::assume(total >= 0);
        kani::assume(available >= 0);
        kani::assume(total >= available);
        assert!(total_capital_covers_available(total, available));
    }

    /// Verify deposit_withdraw_roundtrip preserves total capital.
    #[proof]
    fn verify_deposit_withdraw_roundtrip() {
        let original: i128 = kani::any();
        let deposit: i128 = kani::any();
        let withdrawal: i128 = kani::any();
        kani::assume(original >= 0);
        kani::assume(deposit >= 0);
        kani::assume(withdrawal >= 0);
        kani::assume(withdrawal <= original + deposit);
        let final_total = original + deposit - withdrawal;
        assert!(deposit_withdraw_roundtrip(
            original,
            deposit,
            withdrawal,
            final_total
        ));
    }

    /// Verify vote_sum_equals_total_weight.
    #[proof]
    fn verify_vote_sum_equals_total_weight() {
        let yes: i128 = kani::any();
        let no: i128 = kani::any();
        let total: i128 = kani::any();
        kani::assume(yes >= 0);
        kani::assume(no >= 0);
        kani::assume(total >= 0);
        kani::assume(yes + no == total);
        assert!(vote_sum_equals_total_weight(yes, no, total));
    }

    /// Verify threshold_monotonic: increasing threshold cannot make a failing proposal pass.
    #[proof]
    fn verify_threshold_monotonic() {
        let yes_votes: i128 = kani::any();
        let total_votes: i128 = kani::any();
        let threshold_old: u32 = kani::any();
        let threshold_new: u32 = kani::any();
        kani::assume(yes_votes >= 0);
        kani::assume(total_votes >= 0);
        kani::assume(total_votes > 0);
        kani::assume(threshold_new > threshold_old);
        let passes_old = (yes_votes * 100 / total_votes) >= threshold_old as i128;
        let passes_new = (yes_votes * 100 / total_votes) >= threshold_new as i128;
        kani::assume(!passes_old);
        assert!(!passes_new);
    }

    /// Verify monotonic_nonce.
    #[proof]
    fn verify_monotonic_nonce() {
        let current: u64 = kani::any();
        let supplied: u64 = kani::any();
        kani::assume(supplied == current + 1);
        assert!(monotonic_nonce(current, supplied));
    }

    /// Verify sig_count_within_signers.
    #[proof]
    fn verify_sig_count_within_signers() {
        let sig_count: u32 = kani::any();
        let signer_count: usize = kani::any();
        kani::assume(sig_count as usize <= signer_count);
        assert!(sig_count_within_signers(sig_count, signer_count));
    }

    /// Verify non_negative_premium.
    #[proof]
    fn verify_non_negative_premium() {
        let premium: i128 = kani::any();
        kani::assume(premium >= 0);
        assert!(non_negative_premium(premium));
    }

    /// Verify non_negative_coverage.
    #[proof]
    fn verify_non_negative_coverage() {
        let coverage: i128 = kani::any();
        kani::assume(coverage >= 0);
        assert!(non_negative_coverage(coverage));
    }

    /// Verify future_time_lock.
    #[proof]
    fn verify_future_time_lock() {
        let lock_time: u64 = kani::any();
        let current_time: u64 = kani::any();
        kani::assume(lock_time > current_time);
        assert!(future_time_lock(lock_time, current_time));
    }

    /// Verify distribution_rates_within_bounds.
    #[proof]
    fn verify_distribution_rates_within_bounds() {
        let validator_bp: u32 = kani::any();
        let treasury_bp: u32 = kani::any();
        kani::assume(validator_bp.saturating_add(treasury_bp) <= 10_000);
        assert!(distribution_rates_within_bounds(validator_bp, treasury_bp));
    }

    /// Verify reputation_in_bounds.
    #[proof]
    fn verify_reputation_in_bounds() {
        let reputation: u32 = kani::any();
        kani::assume(reputation <= 1000);
        assert!(reputation_in_bounds(reputation));
    }

    /// Verify fee_bounds_valid.
    #[proof]
    fn verify_fee_bounds_valid() {
        let min_fee: i128 = kani::any();
        let max_fee: i128 = kani::any();
        kani::assume(min_fee >= 0);
        kani::assume(max_fee >= 0);
        kani::assume(min_fee <= max_fee);
        assert!(fee_bounds_valid(min_fee, max_fee));
    }

    /// Verify base_fee_within_bounds.
    #[proof]
    fn verify_base_fee_within_bounds() {
        let base_fee: i128 = kani::any();
        let min_fee: i128 = kani::any();
        let max_fee: i128 = kani::any();
        kani::assume(min_fee >= 0);
        kani::assume(max_fee >= 0);
        kani::assume(min_fee <= base_fee);
        kani::assume(base_fee <= max_fee);
        assert!(base_fee_within_bounds(base_fee, min_fee, max_fee));
    }

    /// Verify history_within_max.
    #[proof]
    fn verify_history_within_max() {
        let len: usize = kani::any();
        let max: usize = kani::any();
        kani::assume(len <= max);
        assert!(history_within_max(len, max));
    }
}
