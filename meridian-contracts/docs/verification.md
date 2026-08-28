# Formal Verification and Property-Based Testing

This document explains how to run, extend, and maintain the formal verification
and property-based testing suite for the PropChain / Meridian-verse contracts.

## Overview

Critical invariants are verified through two complementary techniques:

| Technique | Scope | Tooling |
|-----------|-------|---------|
| **Kani model checking** | Pure Rust invariant functions in `contracts/lib/src/verification/` | [kani](https://github.com/model-checking/kani) |
| **Prusti contracts** | Documentation-level `#[requires]` / `#[ensures]` annotations | [prusti-contracts](https://docs.rs/prusti-contracts) |
| **Proptest property tests** | Contract-level Soroban / ink! test scenarios | [proptest](https://github.com/proptest-rs/proptest) |

The shared invariant definitions live in [`contracts/lib/src/verification/invariants.rs`](contracts/lib/src/verification/invariants.rs).
Kani harnesses that exhaustively check those definitions live in
[`contracts/lib/src/verification/harnesses.rs`](contracts/lib/src/verification/harnesses.rs).

## Quick Start

```bash
# Install verification tools
cargo install cargo-kani

# Run all verification tests
./scripts/test.sh --formal-verification

# Run with coverage
./scripts/run_tests_with_coverage.sh

# Generate audit report
./scripts/generate_formal_verification_report.sh
```

## Verified Invariants

### Risk Pool (`contracts/risk_pool`)
- `available_capital >= 0` — Pool available capital never goes negative
- `total_capital >= available_capital` — Total capital covers available capital
- `deposit_withdraw_roundtrip` — Deposit/withdraw preserves total capital
- `withdrawal_within_available` — Withdrawal never exceeds available capital
- `withdrawal_within_stake` — Withdrawal never exceeds staked balance

### Claims (`contracts/claims`)
- `claim_within_coverage` — `policy.total_claimed + claim.amount <= policy.coverage_amount`
- `non_negative_premium` — Premium amount is non-negative
- `non_negative_coverage` — Coverage amount is non-negative

### Governance (`contracts/governance`)
- `vote_sum_equals_total_weight` — `yes_votes + no_votes == total_weight`
- `threshold_monotonic` — Higher thresholds require proportionally more votes

### Escrow (`contracts/escrow`)
- `monotonic_nonce` — Nonce strictly increases per caller
- `sig_count_within_signers` — Signature count does not exceed signer count
- `future_time_lock` — Time-lock is in the future

### Fees (`contracts/fees`)
- `distribution_rates_within_bounds` — Validator + treasury shares <= 100%
- `fee_bounds_valid` — `min_fee <= max_fee`
- `base_fee_within_bounds` — `min_fee <= base_fee <= max_fee`

### Oracle (`contracts/oracle`)
- `reputation_in_bounds` — Reputation score is within 0-1000

### Slashing (`contracts/slashing`)
- `history_within_max` — Slashing history length does not exceed `MAX_HISTORY`

### Insurance (`contracts/insurance`)
- `claim_within_coverage` — Claim amount does not exceed remaining coverage
- `fee_split_conserves_total` — Platform fee + pool share equals total premium
- `distribution_rates_within_bounds` — Validator + treasury shares <= 100%
- `pool_available_capital_non_negative` — Pool available capital never negative

## Running Verification

### Unit-level (Kani)

```bash
cd contracts/lib
cargo kani --features verification
```

Kani will exhaustively check all `#[kani::proof]` harnesses in
[`harnesses.rs`](contracts/lib/src/verification/harnesses.rs).  Each harness
verifies that an invariant holds for **all possible inputs** within the assumed
bounds.

### Integration-level (Proptest)

```bash
# Run verification tests for all workspace crates
cargo test --features verification

# Run verification for a specific contract
cd contracts/risk_pool
cargo test --features verification
```

Each contract's `verification_tests` module (gated behind `feature = "verification"`)
contains:
- **Kani harnesses** (when `kani` feature is enabled)
- **Proptest property tests** (when `proptest` feature is enabled)
- **End-to-end Soroban tests** that verify invariants using the real test environment

### Full CI Pipeline

```bash
./scripts/test.sh --formal-verification
```

## Extending Verification

### Adding a New Invariant

1. Define the pure function in [`contracts/lib/src/verification/invariants.rs`](contracts/lib/src/verification/invariants.rs):

```rust
/// Invariant: description of what must hold.
#[inline]
pub fn my_new_invariant(value: Amount) -> bool {
    value >= 0
}
```

2. Add a Kani harness in [`contracts/lib/src/verification/harnesses.rs`](contracts/lib/src/verification/harnesses.rs):

```rust
#[cfg(feature = "kani")]
#[kani::proof]
fn kani_verify_my_new_invariant() {
    use stellar_insured_lib::verification::invariants::my_new_invariant;
    let value: i128 = kani::any();
    kani::assume(value >= 0);
    assert!(my_new_invariant(value));
}
```

3. Add a proptest test in the relevant contract's `verification_tests` module:

```rust
#[cfg(feature = "proptest")]
#[test]
fn prop_verify_my_new_invariant() {
    use proptest::prelude::*;
    use stellar_insured_lib::verification::invariants::my_new_invariant;

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(1000))]

        #[test]
        fn prop_my_new_invariant(value in 0i128..=1_000_000_000i128) {
            prop_assert!(my_new_invariant(value));
        }
    }
}
```

### Adding Verification to a New Contract

1. Add `verification` feature to the contract's `Cargo.toml`:

```toml
[features]
default = ["std"]
std = ["soroban-sdk/testutils"]
verification = ["kani", "proptest", "stellar-insured-lib/verification"]
```

2. Add a `verification_tests` module at the bottom of `src/lib.rs`:

```rust
#[cfg(all(test, feature = "verification"))]
mod verification_tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Env, Address};

    // Kani harnesses
    #[cfg(feature = "kani")]
    #[kani::proof]
    fn kani_verify_some_invariant() { ... }

    // Proptest tests
    #[cfg(feature = "proptest")]
    #[test]
    fn prop_verify_some_invariant() { ... }

    // End-to-end Soroban tests
    #[test]
    fn test_invariants_after_operations() { ... }
}
```

## CI Integration

The formal verification suite runs automatically in CI via:

- `.pre-commit-config.yaml` — Runs `cargo test --features verification` on contract files
- `scripts/test.sh --formal-verification` — Full verification pipeline
- `scripts/run_tests_with_coverage.sh` — Verification + coverage
- `scripts/generate_formal_verification_report.sh` — Generates audit artifacts

## Generating Audit Reports

```bash
./scripts/generate_formal_verification_report.sh
```

This produces:
- `verification-report-<timestamp>.md` — Human-readable summary
- `verification-results-<timestamp>.json` — Machine-readable results
- `kani-output-<timestamp>.txt` — Raw kani output
- `proptest-output-<timestamp>.txt` — Raw proptest output

## Architecture

```
contracts/lib/src/verification/
├── mod.rs          # Module declaration (gated on `verification` feature)
├── invariants.rs   # Pure Rust invariant functions (no SDK deps)
└── harnesses.rs    # Kani verification harnesses

contracts/*/src/lib.rs
└── verification_tests (gated on `feature = "verification"`)
    ├── Kani harnesses   (when `kani` enabled)
    ├── Proptest tests   (when `proptest` enabled)
    └── E2E Soroban tests (always when `verification` enabled)

security-tests/src/formal_verification.rs
└── End-to-end invariant checks using proptest strategies
```

## Troubleshooting

### Kani is slow on large harnesses

Kani performs exhaustive bounded model checking.  For complex harnesses, add
 tighter bounds or split into smaller harnesses.

### Proptest tests are flaky

Increase `ProptestConfig::with_cases()` or use `prop_assume!` to filter invalid
inputs.  Check that strategies produce valid inputs for the contract state.

### Verification feature conflicts with `no_std`

The `verification` feature is **not** enabled by default.  It adds `std` and
verification-only dependencies (`kani`, `proptest`) that are incompatible with
production `no_std` builds.
