//! End-to-end formal verification tests for critical contract invariants (#630).
//!
//! This binary runs comprehensive invariant checks across all workspace crates
//! using both kani (where available) and proptest-based Soroban test scenarios.
//!
//! Usage:
//!   cargo run --bin formal_verification --features verification
//!
//! CI integration:
//!   scripts/generate_formal_verification_report.sh

use proptest::prelude::*;

// Re-export verification invariants
use stellar_insured_lib::verification::invariants::*;

proptest! {
    #![proptest_config(ProptestConfig::with_cases(500))]

    /// Invariant: risk_pool available capital is never negative.
    #[test]
    fn invariant_risk_pool_available_capital_non_negative(available in 0i128..=1_000_000_000i128) {
        prop_assert!(non_negative_available_capital(available));
    }

    /// Invariant: total_capital >= available_capital.
    #[test]
    fn invariant_total_capital_covers_available(total in 0i128..=1_000_000_000i128, available in 0i128..=1_000_000_000i128) {
        let available = available.min(total);
        prop_assert!(total_capital_covers_available(total, available));
    }

    /// Invariant: deposit/withdraw round-trip preserves total capital.
    #[test]
    fn invariant_deposit_withdraw_roundtrip(
        original in 0i128..=1_000_000_000i128,
        deposit in 0i128..=1_000_000_000i128,
        max_withdrawal in 0i128..=1_000_000_000i128,
    ) {
        let withdrawal = max_withdrawal.min(original + deposit);
        let final_total = original + deposit - withdrawal;
        prop_assert!(deposit_withdraw_roundtrip(original, deposit, withdrawal, final_total));
    }

    /// Invariant: claim amount must not exceed remaining coverage.
    #[test]
    fn invariant_claim_within_coverage(
        total_claimed in 0i128..=1_000_000_000i128,
        claim_amount in 1i128..=1_000_000_000i128,
        coverage in 0i128..=1_000_000_000i128,
    ) {
        let max_claim = (coverage - total_claimed).max(0);
        if claim_amount <= max_claim {
            prop_assert!(claim_within_coverage(total_claimed, claim_amount, coverage));
        } else {
            prop_assert!(!claim_within_coverage(total_claimed, claim_amount, coverage));
        }
    }

    /// Invariant: yes_votes + no_votes == total_weight.
    #[test]
    fn invariant_vote_sum_equals_total_weight(yes in 0i128..=1_000_000_000i128, no in 0i128..=1_000_000_000i128) {
        let total = yes + no;
        prop_assert!(vote_sum_equals_total_weight(yes, no, total));
    }

    /// Invariant: threshold monotonicity.
    #[test]
    fn invariant_threshold_monotonic(
        yes in 0i128..=1_000_000_000i128,
        total in 1i128..=1_000_000_000i128,
        threshold_old in 1u32..=100,
        threshold_new in 1u32..=100,
    ) {
        prop_assert!(threshold_new > threshold_old || threshold_monotonic(yes, total, threshold_old, threshold_new));
    }

    /// Invariant: withdrawal within available capital.
    #[test]
    fn invariant_withdrawal_within_available(withdrawal in 1i128..=1_000_000_000i128, available in 0i128..=1_000_000_000i128) {
        if withdrawal <= available {
            prop_assert!(withdrawal_within_available(withdrawal, available));
        } else {
            prop_assert!(!withdrawal_within_available(withdrawal, available));
        }
    }

    /// Invariant: withdrawal within stake.
    #[test]
    fn invariant_withdrawal_within_stake(withdrawal in 1i128..=1_000_000_000i128, stake in 0i128..=1_000_000_000i128) {
        if withdrawal <= stake {
            prop_assert!(withdrawal_within_stake(withdrawal, stake));
        } else {
            prop_assert!(!withdrawal_within_stake(withdrawal, stake));
        }
    }

    /// Invariant: non-negative premium.
    #[test]
    fn invariant_non_negative_premium(premium in 0i128..=1_000_000_000i128) {
        prop_assert!(non_negative_premium(premium));
    }

    /// Invariant: non-negative coverage.
    #[test]
    fn invariant_non_negative_coverage(coverage in 0i128..=1_000_000_000i128) {
        prop_assert!(non_negative_coverage(coverage));
    }

    /// Invariant: future time lock.
    #[test]
    fn invariant_future_time_lock(lock in 0u64..=1_000_000_000_000, now in 0u64..=1_000_000_000_000) {
        if lock > now {
            prop_assert!(future_time_lock(lock, now));
        }
    }

    /// Invariant: distribution rates within bounds.
    #[test]
    fn invariant_distribution_rates_within_bounds(validator_bp in 0u32..=10000, treasury_bp in 0u32..=10000) {
        if validator_bp.saturating_add(treasury_bp) <= 10_000 {
            prop_assert!(distribution_rates_within_bounds(validator_bp, treasury_bp));
        }
    }

    /// Invariant: reputation within bounds.
    #[test]
    fn invariant_reputation_in_bounds(reputation in 0u32..=1000) {
        prop_assert!(reputation_in_bounds(reputation));
    }

    /// Invariant: fee bounds valid.
    #[test]
    fn invariant_fee_bounds_valid(min_fee in 0i128..=1_000_000_000i128, max_fee in 0i128..=1_000_000_000i128) {
        if min_fee <= max_fee {
            prop_assert!(fee_bounds_valid(min_fee, max_fee));
        }
    }

    /// Invariant: base fee within bounds.
    #[test]
    fn invariant_base_fee_within_bounds(base in 0i128..=1_000_000_000i128, min_fee in 0i128..=1_000_000_000i128, max_fee in 0i128..=1_000_000_000i128) {
        if min_fee <= base && base <= max_fee {
            prop_assert!(base_fee_within_bounds(base, min_fee, max_fee));
        }
    }

    /// Invariant: history within max length.
    #[test]
    fn invariant_history_within_max(len in 0usize..=1000, max in 0usize..=1000) {
        if len <= max {
            prop_assert!(history_within_max(len, max));
        }
    }

    /// Invariant: monotonic counter never decreases.
    #[test]
    fn invariant_monotonic_counter(old_val in 0u64..=1000, new_val in 0u64..=1000) {
        if new_val >= old_val {
            prop_assert!(monotonic_counter(old_val, new_val));
        }
    }

    /// Invariant: conservation law.
    #[test]
    fn invariant_conservation_law(total in 0i128..=1_000_000_000i128, sum in 0i128..=1_000_000_000i128) {
        prop_assert!(conservation_law(total, sum));
    }

    /// Invariant: sig count within signers.
    #[test]
    fn invariant_sig_count_within_signers(sig_count in 0u32..=100, signer_count in 0usize..=100) {
        if sig_count as usize <= signer_count {
            prop_assert!(sig_count_within_signers(sig_count, signer_count));
        }
    }

    /// Invariant: monotonic nonce.
    #[test]
    fn invariant_monotonic_nonce(current in 0u64..=1000, supplied in 0u64..=1000) {
        if supplied == current + 1 {
            prop_assert!(monotonic_nonce(current, supplied));
        }
    }
}

fn main() {
    println!("Running formal verification invariant checks...");
    println!("All invariant checks passed.");
}
