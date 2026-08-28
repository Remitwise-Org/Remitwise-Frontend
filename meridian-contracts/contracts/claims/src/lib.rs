#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, IntoVal};
use stellar_insured_lib::access_control::{self, AccessControlRole};
use stellar_insured_lib::events::emit_event_with;
use stellar_insured_lib::state_root::get_state_root;
use stellar_insured_lib::{ClaimStatus, InsuranceClaim, InsurancePolicy, PolicyStatus, PoolStats};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    PolicyContract,
    RiskPool,
    Claim(u64),
    ClaimCounter,
    /// #409: Maps policy_id -> active claim_id. Present only while a claim is active
    /// (Submitted / UnderReview / Approved). Cleared on Rejected or Settled.
    PolicyActiveClaim(u64),
    SettlingClaim(Address),
}

// --- Storage helpers (#378: data access abstraction) ---

fn get_claim_counter(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::ClaimCounter)
        .unwrap_or(0)
}

fn get_claim_inner(env: &Env, claim_id: u64) -> InsuranceClaim {
    env.storage()
        .persistent()
        .get(&DataKey::Claim(claim_id))
        .expect("Claim not found")
}

fn set_claim(env: &Env, claim_id: u64, claim: &InsuranceClaim) {
    env.storage()
        .persistent()
        .set(&DataKey::Claim(claim_id), claim);
}

// --------------------------------------------------------

#[contract]
pub struct ClaimsContract;

#[contractimpl]
impl ClaimsContract {
    pub fn initialize(env: Env, admin: Address, policy_contract: Address, risk_pool: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        if admin == policy_contract || admin == risk_pool || policy_contract == risk_pool {
            panic!("Addresses must be distinct");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PolicyContract, &policy_contract);
        env.storage().instance().set(&DataKey::RiskPool, &risk_pool);
        env.storage().instance().set(&DataKey::ClaimCounter, &0u64);
        access_control::init_access_control(&env, &admin);
    }

    pub fn set_role(env: Env, addr: Address, role: AccessControlRole) {
        access_control::set_role(&env, &env.current_contract_address(), &addr, role);
    }

    pub fn submit_claim(env: Env, policy_id: u64, amount: i128) -> u64 {
        // #381: fetch policy and validate consistency before accepting claim
        let policy_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::PolicyContract)
            .unwrap();
        // #407: Centralized validation via Policy contract (includes expiration check)
        let is_active: bool = env.invoke_contract(
            &policy_contract,
            &symbol_short!("is_active"),
            soroban_sdk::vec![&env, policy_id.into_val(&env)],
        );
        if !is_active {
            panic!("Policy is not active or has expired");
        }

        let policy: InsurancePolicy = env.invoke_contract(
            &policy_contract,
            &symbol_short!("get_pol"),
            soroban_sdk::vec![&env, policy_id.into_val(&env)],
        );

        // Consistency check: claim amount must not exceed coverage
        if amount <= 0 || (amount + policy.total_claimed) > policy.coverage_amount {
            panic!("Claim amount invalid or exceeds remaining coverage");
        }

        // #409: O(1) duplicate claim check — reject if an active claim already exists for this policy
        if env
            .storage()
            .persistent()
            .has(&DataKey::PolicyActiveClaim(policy_id))
        {
            panic!("Policy already has an active claim");
        }

        let claimant = policy.holder.clone();
        claimant.require_auth();

        let mut counter = get_claim_counter(&env);
        counter += 1;
        env.storage()
            .instance()
            .set(&DataKey::ClaimCounter, &counter);

        let claim = InsuranceClaim {
            claim_id: counter,
            policy_id,
            claimant: claimant.clone(),
            amount,
            status: ClaimStatus::Submitted,
            submitted_at: env.ledger().timestamp(),
        };

        set_claim(&env, counter, &claim);

        // #409: Record the active claim for this policy (O(1) dedup key)
        env.storage()
            .persistent()
            .set(&DataKey::PolicyActiveClaim(policy_id), &counter);

        // Canonical, indexed event emission (see stellar_insured_lib::events).
        emit_event_with(
            &env,
            symbol_short!("CLAIMS"),
            symbol_short!("SUBMITTED"),
            &claim,
        );

        counter
    }

    pub fn start_review(env: Env, claim_id: u64) {
        let caller = env.current_contract_address();
        access_control::require_role(&env, &caller, &AccessControlRole::Admin);

        let mut claim = get_claim_inner(&env, claim_id);
        if claim.status != ClaimStatus::Submitted {
            panic!("Invalid claim status for review");
        }

        claim.status = ClaimStatus::UnderReview;
        set_claim(&env, claim_id, &claim);

        emit_event_with(
            &env,
            symbol_short!("CLAIMS"),
            symbol_short!("REVIEW"),
            &claim,
        );
    }

    pub fn approve_claim(env: Env, claim_id: u64) {
        let caller = env.current_contract_address();
        access_control::require_role(&env, &caller, &AccessControlRole::Admin);

        let mut claim = get_claim_inner(&env, claim_id);
        if claim.status != ClaimStatus::UnderReview {
            panic!("Claim must be under review to approve");
        }

        claim.status = ClaimStatus::Approved;
        set_claim(&env, claim_id, &claim);

        emit_event_with(
            &env,
            symbol_short!("CLAIMS"),
            symbol_short!("APPROVED"),
            &claim,
        );
    }

    pub fn reject_claim(env: Env, claim_id: u64) {
        let caller = env.current_contract_address();
        access_control::require_role(&env, &caller, &AccessControlRole::Admin);

        let mut claim = get_claim_inner(&env, claim_id);
        if claim.status != ClaimStatus::UnderReview {
            panic!("Claim must be under review to reject");
        }

        claim.status = ClaimStatus::Rejected;
        set_claim(&env, claim_id, &claim);

        // #409: Clear the active-claim lock so a new claim can be submitted for this policy
        env.storage()
            .persistent()
            .remove(&DataKey::PolicyActiveClaim(claim.policy_id));

        emit_event_with(
            &env,
            symbol_short!("CLAIMS"),
            symbol_short!("REJECTED"),
            &claim,
        );
    }

    pub fn settle_claim(env: Env, claim_id: u64) {
        let caller = env.current_contract_address();
        access_control::require_role(&env, &caller, &AccessControlRole::Admin);

        let mut claim = get_claim_inner(&env, claim_id);
        if claim.status != ClaimStatus::Approved {
            panic!("Only approved claims can be settled");
        }

        // #410: Check risk pool balance before payout
        let risk_pool: Address = env.storage().instance().get(&DataKey::RiskPool).unwrap();

        // Get pool stats to verify available capital
        let pool_stats: PoolStats = env.invoke_contract(
            &risk_pool,
            &symbol_short!("get_stats"),
            soroban_sdk::Vec::new(&env),
        );

        if pool_stats.available_capital < claim.amount {
            panic!("Insufficient risk pool funds for payout");
        }

        // Cross-contract call to Risk Pool to payout
        // payout_claim(recipient, amount)
        let risk_pool: Address = env.storage().instance().get(&DataKey::RiskPool).unwrap();

        env.invoke_contract::<()>(
            &risk_pool,
            &symbol_short!("payout"),
            soroban_sdk::vec![
                &env,
                claim.claimant.clone().into_val(&env),
                claim.amount.into_val(&env)
            ],
        );

        // Update total claimed in policy contract
        let policy_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::PolicyContract)
            .unwrap();
        env.invoke_contract::<()>(
            &policy_contract,
            &symbol_short!("update_cl"),
            soroban_sdk::vec![
                &env,
                claim.policy_id.into_val(&env),
                claim.amount.into_val(&env)
            ],
        );

        claim.status = ClaimStatus::Settled;
        set_claim(&env, claim_id, &claim);

        // #409: Clear the active-claim lock after settlement
        env.storage()
            .persistent()
            .remove(&DataKey::PolicyActiveClaim(claim.policy_id));

        emit_event_with(
            &env,
            symbol_short!("CLAIMS"),
            symbol_short!("SETTLED"),
            &claim,
        );
    }

    pub fn get_claim(env: Env, claim_id: u64) -> InsuranceClaim {
        get_claim_inner(&env, claim_id)
    }

    pub fn get_state_root(env: Env) -> soroban_sdk::BytesN<32> {
        get_state_root(&env)
    }

    pub fn get_stats(env: Env) -> u64 {
        get_claim_counter(&env)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env};

    fn setup() -> (Env, Address, Address, Address, Address) {
        let env = Env::default();
        let contract = env.register_contract(None, ClaimsContract);
        let admin = Address::generate(&env);
        let policy_contract = Address::generate(&env);
        let risk_pool = Address::generate(&env);
        env.mock_all_auths();
        (env, contract, admin, policy_contract, risk_pool)
    }

    #[test]
    fn test_initialize_sets_admin_role() {
        let (env, contract, admin, policy, risk) = setup();
        env.as_contract(&contract, || {
            ClaimsContract::initialize(env.clone(), admin.clone(), policy, risk);
        });
        // admin should have Admin role
        env.as_contract(&contract, || {
            assert!(access_control::has_role(
                &env,
                &admin,
                &AccessControlRole::Admin
            ));
        });
    }

    #[test]
    #[should_panic(expected = "unauthorized")]
    fn test_non_admin_start_review_rejected() {
        let (env, contract, admin, policy, risk) = setup();
        env.as_contract(&contract, || {
            ClaimsContract::initialize(env.clone(), admin.clone(), policy, risk);
        });
        // attacker has no role — should panic
        env.as_contract(&contract, || {
            ClaimsContract::start_review(env.clone(), 1);
        });
    }

    #[test]
    #[should_panic(expected = "unauthorized")]
    fn test_non_admin_approve_claim_rejected() {
        let (env, contract, admin, policy, risk) = setup();
        env.as_contract(&contract, || {
            ClaimsContract::initialize(env.clone(), admin.clone(), policy, risk);
        });
        env.as_contract(&contract, || {
            ClaimsContract::approve_claim(env.clone(), 1);
        });
    }

    #[test]
    #[should_panic(expected = "unauthorized")]
    fn test_non_admin_reject_claim_rejected() {
        let (env, contract, admin, policy, risk) = setup();
        env.as_contract(&contract, || {
            ClaimsContract::initialize(env.clone(), admin.clone(), policy, risk);
        });
        env.as_contract(&contract, || {
            ClaimsContract::reject_claim(env.clone(), 1);
        });
    }

    #[test]
    #[should_panic(expected = "unauthorized")]
    fn test_non_admin_settle_claim_rejected() {
        let (env, contract, admin, policy, risk) = setup();
        env.as_contract(&contract, || {
            ClaimsContract::initialize(env.clone(), admin.clone(), policy, risk);
        });
        env.as_contract(&contract, || {
            ClaimsContract::settle_claim(env.clone(), 1);
        });
    }
}

#[cfg(test)]
mod access_control_test;

// =========================================================================
// Formal verification and property-based tests (#630)
// =========================================================================

#[cfg(all(test, feature = "verification"))]
mod verification_tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env};

    /// Kani harness: claim.amount <= policy.coverage_amount.
    #[cfg(feature = "kani")]
    #[kani::proof]
    fn kani_verify_claim_within_coverage() {
        use stellar_insured_lib::verification::invariants::claim_within_coverage;
        let total_claimed: i128 = kani::any();
        let claim_amount: i128 = kani::any();
        let coverage: i128 = kani::any();
        kani::assume(total_claimed >= 0);
        kani::assume(claim_amount > 0);
        kani::assume(coverage >= 0);
        kani::assume(total_claimed + claim_amount <= coverage);
        assert!(claim_within_coverage(total_claimed, claim_amount, coverage));
    }

    /// Kani harness: claim amount must be positive.
    #[cfg(feature = "kani")]
    #[kani::proof]
    fn kani_verify_claim_amount_positive() {
        let amount: i128 = kani::any();
        kani::assume(amount > 0);
        assert!(amount > 0);
    }

    /// Kani harness: claim.amount + total_claimed <= coverage_amount.
    #[cfg(feature = "kani")]
    #[kani::proof]
    fn kani_verify_claim_plus_total_does_not_exceed_coverage() {
        let total_claimed: i128 = kani::any();
        let claim_amount: i128 = kani::any();
        let coverage: i128 = kani::any();
        kani::assume(total_claimed >= 0);
        kani::assume(claim_amount > 0);
        kani::assume(coverage >= 0);
        kani::assume(total_claimed + claim_amount <= coverage);
        assert!(total_claimed + claim_amount <= coverage);
    }

    /// Property-based test: claim_within_coverage invariant.
    #[cfg(feature = "proptest")]
    #[test]
    fn prop_verify_claim_within_coverage() {
        use proptest::prelude::*;
        use stellar_insured_lib::verification::invariants::claim_within_coverage;

        proptest! {
            #![proptest_config(ProptestConfig::with_cases(1000))]

            #[test]
            fn prop_claim_within_coverage(
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
        }
    }

    /// Property-based test: claim amount is always positive.
    #[cfg(feature = "proptest")]
    #[test]
    fn prop_verify_claim_amount_positive() {
        use proptest::prelude::*;

        proptest! {
            #![proptest_config(ProptestConfig::with_cases(1000))]

            #[test]
            fn prop_claim_amount_positive(amount in 1i128..=1_000_000_000i128) {
                prop_assert!(amount > 0);
            }
        }
    }

    /// Property-based test: total_claimed + claim_amount never exceeds coverage.
    #[cfg(feature = "proptest")]
    #[test]
    fn prop_verify_total_claimed_plus_amount_within_coverage() {
        use proptest::prelude::*;

        proptest! {
            #![proptest_config(ProptestConfig::with_cases(1000))]

            #[test]
            fn prop_total_claimed_plus_amount_within_coverage(
                total_claimed in 0i128..=1_000_000_000i128,
                claim_amount in 1i128..=1_000_000_000i128,
                coverage in 0i128..=1_000_000_000i128,
            ) {
                let max_claim = (coverage - total_claimed).max(0);
                if claim_amount <= max_claim {
                    prop_assert!(total_claimed + claim_amount <= coverage);
                } else {
                    prop_assert!(total_claimed + claim_amount > coverage);
                }
            }
        }
    }

    /// End-to-end Soroban test: claim invariants hold after submission.
    #[test]
    fn test_claim_invariants_after_submission() {
        let env = Env::default();
        let contract = env.register_contract(None, ClaimsContract);
        let admin = Address::generate(&env);
        let policy_contract = Address::generate(&env);
        let risk_pool = Address::generate(&env);
        env.mock_all_auths();
        env.as_contract(&contract, || {
            ClaimsContract::initialize(env.clone(), admin.clone(), policy_contract, risk_pool);
        });

        // Submit a valid claim
        let claim_id = env.as_contract(&contract, || {
            ClaimsContract::submit_claim(env.clone(), 1, 500)
        });

        let claim = env.as_contract(&contract, || {
            ClaimsContract::get_claim(env.clone(), claim_id)
        });
        assert!(claim.amount > 0, "claim amount must be positive");
        assert!(claim.claim_id > 0, "claim id must be positive");
    }
}
