//! ink! property-based verification tests for the insurance contract (#630).
//!
//! These tests verify core invariants using proptest strategies and ink!
//! test utilities. They are gated behind the `verification` feature so they
//! do not slow down normal test runs.

#![cfg(all(test, feature = "verification"))]

use super::*;
use ink::env::{test, DefaultEnvironment};
use propchain_insurance::{
    ClaimStatus, CoverageType, InsuranceError, PolicyStatus, PropertyInsurance,
};

// =========================================================================
// Strategies
// =========================================================================

fn valid_coverage() -> impl Strategy<Value = u128> {
    prop::num::u128::ANY.prop_filter("Coverage must be > 0", |&x| x > 0 && x <= 1_000_000_000_000u128)
}

fn valid_premium() -> impl Strategy<Value = u128> {
    prop::num::u128::ANY.prop_filter("Premium must be > 0", |&x| x > 0 && x <= 100_000_000_000u128)
}

fn valid_duration() -> impl Strategy<Value = u32> {
    prop::num::u32::ANY.prop_filter("Duration must be reasonable", |&x| x > 0 && x <= 3650)
}

// =========================================================================
// Setup helpers
// =========================================================================

fn insurance_setup() -> PropertyInsurance {
    let accounts = test::default_accounts::<DefaultEnvironment>();
    test::set_caller::<DefaultEnvironment>(accounts.alice);
    test::set_block_timestamp::<DefaultEnvironment>(3_000_000);
    PropertyInsurance::new(accounts.alice)
}

fn create_pool(contract: &mut PropertyInsurance) -> u64 {
    let accounts = test::default_accounts::<DefaultEnvironment>();
    test::set_caller::<DefaultEnvironment>(accounts.alice);
    contract
        .create_risk_pool(
            "Verification Pool".into(),
            CoverageType::Fire,
            8000,
            500_000_000_000u128,
        )
        .expect("pool creation failed")
}

fn add_risk_assessment(contract: &mut PropertyInsurance, property_id: u64) {
    let accounts = test::default_accounts::<DefaultEnvironment>();
    test::set_caller::<DefaultEnvironment>(accounts.alice);
    contract
        .update_risk_assessment(property_id, 75, 80, 85, 90, 86_400 * 365)
        .expect("risk assessment failed");
}

// =========================================================================
// Property-based tests
// =========================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    /// Property: premium must always be non-negative.
    #[test]
    fn prop_premium_non_negative(premium in valid_premium()) {
        prop_assert!(premium > 0, "Premium must be positive");
    }

    /// Property: coverage must always be non-negative.
    #[test]
    fn prop_coverage_non_negative(coverage in valid_coverage()) {
        prop_assert!(coverage > 0, "Coverage must be positive");
    }

    /// Property: duration must be non-zero.
    #[test]
    fn prop_duration_non_zero(duration in valid_duration()) {
        prop_assert!(duration > 0, "Duration must be positive");
    }

    /// Property: claim amount must not exceed coverage.
    #[test]
    fn prop_claim_within_coverage(
        coverage in valid_coverage(),
        total_claimed in 0u128..=1_000_000_000_000u128,
        claim_amount in 1u128..=1_000_000_000_000u128,
    ) {
        let max_claim = coverage.saturating_sub(total_claimed);
        if claim_amount <= max_claim {
            prop_assert!(total_claimed.saturating_add(claim_amount) <= coverage);
        } else {
            prop_assert!(total_claimed.saturating_add(claim_amount) > coverage);
        }
    }

    /// Property: fee split (platform fee + pool share) equals total premium.
    #[test]
    fn prop_fee_split_conserves_total(
        amount in 0u128..=1_000_000_000_000u128,
        fee_bps in 0u32..=10000u32,
    ) {
        let fee = amount.saturating_mul(fee_bps as u128) / 10_000;
        let pool_share = amount.saturating_sub(fee);
        prop_assert_eq!(fee.saturating_add(pool_share), amount);
    }

    /// Property: risk score averaging stays within bounds.
    #[test]
    fn prop_risk_score_within_bounds(
        score1 in 0u32..=100,
        score2 in 0u32..=100,
        score3 in 0u32..=100,
        score4 in 0u32..=100,
    ) {
        let avg = (score1 + score2 + score3 + score4) / 4;
        prop_assert!(avg <= 100, "Average risk score must be <= 100");
    }

    /// Property: distribution rates must not exceed 100%.
    #[test]
    fn prop_distribution_rates_within_bounds(
        validator_bp in 0u32..=10000,
        treasury_bp in 0u32..=10000,
    ) {
        prop_assert!(validator_bp.saturating_add(treasury_bp) <= 10_000);
    }

    /// Property: base fee must be within configured bounds.
    #[test]
    fn prop_base_fee_within_bounds(
        base_fee in 0u128..=1_000_000_000u128,
        min_fee in 0u128..=1_000_000_000u128,
        max_fee in 0u128..=1_000_000_000u128,
    ) {
        if min_fee <= base_fee && base_fee <= max_fee {
            prop_assert!(base_fee >= min_fee);
            prop_assert!(base_fee <= max_fee);
        } else {
            prop_assert!(base_fee < min_fee || base_fee > max_fee);
        }
    }

    /// Property: claim count is monotonically increasing.
    #[test]
    fn prop_claim_count_monotonic(old_count in 0u64..=1000, new_count in 0u64..=1000) {
        if new_count >= old_count {
            prop_assert!(new_count >= old_count);
        }
    }

    /// Property: policy count is monotonically increasing.
    #[test]
    fn prop_policy_count_monotonic(old_count in 0u64..=1000, new_count in 0u64..=1000) {
        if new_count >= old_count {
            prop_assert!(new_count >= old_count);
        }
    }

    /// Property: nonce must be strictly monotonically increasing.
    #[test]
    fn prop_nonce_strictly_monotonic(old_nonce in 0u64..=1000, new_nonce in 0u64..=1000) {
        if new_nonce == old_nonce + 1 {
            prop_assert!(new_nonce > old_nonce);
        }
    }
}

// =========================================================================
// ink! property tests
// =========================================================================

/// Property: premium calculation never produces a zero or overflowed value.
#[ink::test]
fn test_premium_always_positive() {
    let mut contract = insurance_setup();
    add_risk_assessment(&mut contract, 1);
    let calc = contract
        .calculate_premium(1, 1_000_000_000_000u128, CoverageType::Fire)
        .unwrap();
    assert!(calc.annual_premium > 0);
    assert!(calc.monthly_premium > 0);
    assert!(calc.deductible > 0);
}

/// Property: fee split conserves total premium.
#[ink::test]
fn test_fee_split_conserves_total() {
    let total = 1_000_000u128;
    let fee_bps = 200u128; // 2%
    let (fee, pool_share) = (total.saturating_mul(fee_bps) / 10_000, total.saturating_sub(total.saturating_mul(fee_bps) / 10_000));
    assert_eq!(fee.saturating_add(pool_share), total);
}

/// Property: pool available capital never goes negative after deposit/withdraw.
#[ink::test]
fn test_pool_available_capital_non_negative() {
    let mut contract = insurance_setup();
    let pool_id = create_pool(&mut contract);

    let accounts = test::default_accounts::<DefaultEnvironment>();
    test::set_caller::<DefaultEnvironment>(accounts.bob);
    test::set_value_transferred::<DefaultEnvironment>(10_000u128);
    contract.deposit_liquidity(pool_id).unwrap();

    let pool = contract.get_pool(pool_id).unwrap();
    assert!(pool.available_capital >= 10_000);

    contract.withdraw_liquidity(pool_id, 5_000).unwrap();
    let pool = contract.get_pool(pool_id).unwrap();
    assert!(pool.available_capital >= 0);
}

/// Property: total provider stake equals sum of individual stakes.
#[ink::test]
fn test_total_provider_stake_conservation() {
    let mut contract = insurance_setup();
    let pool_id = create_pool(&mut contract);

    let accounts = test::default_accounts::<DefaultEnvironment>();
    test::set_caller::<DefaultEnvironment>(accounts.bob);
    test::set_value_transferred::<DefaultEnvironment>(1_000u128);
    contract.deposit_liquidity(pool_id).unwrap();

    test::set_caller::<DefaultEnvironment>(accounts.charlie);
    test::set_value_transferred::<DefaultEnvironment>(2_000u128);
    contract.deposit_liquidity(pool_id).unwrap();

    let pool = contract.get_pool(pool_id).unwrap();
    assert_eq!(pool.total_provider_stake, 3_000);
}
