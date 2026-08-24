#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};
use stellar_insured_lib::access_control::{self, AccessControlRole};
use stellar_insured_lib::events::emit_event_with;
use stellar_insured_lib::state_root::get_state_root;
use stellar_insured_lib::{
    InsurancePolicy, PolicyParams, PolicyPatch, PolicyStatus, PolicyType, StatusPatch,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    RiskPool,
    ClaimsContract,
    GovernanceContract,
    PolicyParams,
    Policy(u64),
    PolicyCounter,
}

// #609: default parameters used until the DAO sets its own via
// `apply_governance_params`. Effectively unconstrained so existing callers
// (and tests) keep working until governance opts into tighter limits.
fn default_policy_params(_env: &Env) -> PolicyParams {
    PolicyParams {
        max_coverage_amount: i128::MAX,
        min_premium_amount: 0,
    }
}

fn policy_params_or_default(env: &Env) -> PolicyParams {
    env.storage()
        .instance()
        .get(&DataKey::PolicyParams)
        .unwrap_or_else(|| default_policy_params(env))
}

// --- Storage helpers (#378: data access abstraction) ---

fn get_policy_counter(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::PolicyCounter)
        .unwrap_or(0)
}

fn get_policy_inner(env: &Env, policy_id: u64) -> InsurancePolicy {
    env.storage()
        .persistent()
        .get(&DataKey::Policy(policy_id))
        .expect("Policy not found")
}

fn set_policy(env: &Env, policy_id: u64, policy: &InsurancePolicy) {
    env.storage()
        .persistent()
        .set(&DataKey::Policy(policy_id), policy);
}

// --------------------------------------------------------

#[contract]
pub struct PolicyContract;

#[contractimpl]
impl PolicyContract {
    pub fn initialize(env: Env, admin: Address, risk_pool: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::RiskPool, &risk_pool);
        env.storage().instance().set(&DataKey::PolicyCounter, &0u64);
        access_control::init_access_control(&env, &admin);
    }

    pub fn set_role(env: Env, addr: Address, role: AccessControlRole) {
        access_control::set_role(&env, &env.current_contract_address(), &addr, role);
    }

    pub fn issue_policy(
        env: Env,
        holder: Address,
        coverage_amount: i128,
        premium_amount: i128,
        duration_days: u32,
        policy_type: PolicyType,
    ) -> u64 {
        let caller = env.current_contract_address();
        access_control::require_role(&env, &caller, &AccessControlRole::Admin);

        // #609: enforce DAO-governed coverage/premium bounds.
        let params = policy_params_or_default(&env);
        if coverage_amount > params.max_coverage_amount {
            panic!("Coverage amount exceeds DAO-governed maximum");
        }
        if premium_amount < params.min_premium_amount {
            panic!("Premium amount below DAO-governed minimum");
        }

        let mut counter = get_policy_counter(&env);
        counter += 1;
        env.storage()
            .instance()
            .set(&DataKey::PolicyCounter, &counter);

        let risk_pool: Address = env
            .storage()
            .instance()
            .get(&DataKey::RiskPool)
            .unwrap_or_else(|| panic!("Contract not initialized"));

        let policy = InsurancePolicy {
            policy_id: counter,
            holder: holder.clone(),
            coverage_amount,
            premium_amount,
            start_time: env.ledger().timestamp(),
            duration_days,
            policy_type,
            status: PolicyStatus::Active,
            risk_pool,
            total_claimed: 0,
        };

        set_policy(&env, counter, &policy);

        emit_event_with(
            &env,
            symbol_short!("POLICY"),
            symbol_short!("ISSUED"),
            &(
                counter,
                holder,
                coverage_amount,
                premium_amount,
                duration_days,
            ),
        );

        counter
    }

    pub fn get_policy(env: Env, policy_id: u64) -> InsurancePolicy {
        get_policy_inner(&env, policy_id)
    }

    pub fn get_state_root(env: Env) -> soroban_sdk::BytesN<32> {
        get_state_root(&env)
    }

    // Alias used by claims contract cross-contract call
    pub fn get_pol(env: Env, policy_id: u64) -> InsurancePolicy {
        get_policy_inner(&env, policy_id)
    }

    pub fn is_active(env: Env, policy_id: u64) -> bool {
        let policy = get_policy_inner(&env, policy_id);
        if policy.status != PolicyStatus::Active && policy.status != PolicyStatus::Renewed {
            return false;
        }

        let now = env.ledger().timestamp();
        let expiry = policy.start_time + (policy.duration_days as u64 * 86400);
        now <= expiry
    }

    pub fn renew_policy(env: Env, policy_id: u64, duration_days: u32) {
        let mut policy = get_policy_inner(&env, policy_id);
        policy.holder.require_auth();

        if policy.status != PolicyStatus::Active && policy.status != PolicyStatus::Renewed {
            panic!("Policy not active");
        }

        // #407: Ensure policy hasn't expired before renewal
        let now = env.ledger().timestamp();
        let expiry = policy.start_time + (policy.duration_days as u64 * 86400);
        if now > expiry {
            panic!("Policy has expired and cannot be renewed");
        }

        policy.duration_days += duration_days;
        policy.status = PolicyStatus::Renewed;

        set_policy(&env, policy_id, &policy);

        emit_event_with(
            &env,
            symbol_short!("POLICY"),
            symbol_short!("RENEWED"),
            &(policy_id, policy.holder, duration_days),
        );
    }

    pub fn cancel_policy(env: Env, policy_id: u64) {
        let mut policy = get_policy_inner(&env, policy_id);
        policy.holder.require_auth();

        // #407: Ensure policy hasn't expired before cancellation
        let now = env.ledger().timestamp();
        let expiry = policy.start_time + (policy.duration_days as u64 * 86400);
        if now > expiry {
            panic!("Policy has already expired");
        }

        policy.status = PolicyStatus::Cancelled;
        set_policy(&env, policy_id, &policy);

        emit_event_with(
            &env,
            symbol_short!("POLICY"),
            symbol_short!("CANCELED"),
            &(policy_id, policy.holder, policy.coverage_amount),
        );
    }

    pub fn set_claims_contract(env: Env, claims_contract: Address) {
        let caller = env.current_contract_address();
        access_control::require_role(&env, &caller, &AccessControlRole::Admin);
        env.storage()
            .instance()
            .set(&DataKey::ClaimsContract, &claims_contract);
    }

    // #609: register the Governance contract trusted to patch policies and
    // update DAO-governed parameters. Admin-gated, mirroring `set_claims_contract`.
    pub fn set_governance_contract(env: Env, governance_contract: Address) {
        let caller = env.current_contract_address();
        access_control::require_role(&env, &caller, &AccessControlRole::Admin);
        env.storage()
            .instance()
            .set(&DataKey::GovernanceContract, &governance_contract);
    }

    pub fn get_policy_params(env: Env) -> PolicyParams {
        policy_params_or_default(&env)
    }

    // #609: only the stored Governance contract may execute a DAO-passed
    // PolicyChange proposal. Mirrors `update_claimed`'s trust model: fetch the
    // trusted address from storage and require its auth, rather than trusting
    // a caller-supplied address.
    pub fn apply_governance_update(env: Env, policy_id: u64, patch: PolicyPatch) {
        let governance_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::GovernanceContract)
            .expect("Governance contract not set");
        governance_contract.require_auth();

        let mut policy = get_policy_inner(&env, policy_id);
        let params = policy_params_or_default(&env);

        if let Some(coverage_amount) = patch.coverage_amount {
            if coverage_amount <= 0 || coverage_amount > params.max_coverage_amount {
                panic!("Invalid coverage_amount in policy patch");
            }
            if policy.total_claimed > coverage_amount {
                panic!("Coverage amount below total already claimed");
            }
            policy.coverage_amount = coverage_amount;
        }

        if let Some(premium_amount) = patch.premium_amount {
            if premium_amount < params.min_premium_amount {
                panic!("Invalid premium_amount in policy patch");
            }
            policy.premium_amount = premium_amount;
        }

        if let StatusPatch::Set(status) = patch.status {
            if policy.status == PolicyStatus::Expired || policy.status == PolicyStatus::Cancelled {
                panic!("Cannot change status of a terminal policy");
            }
            policy.status = status;
        }

        set_policy(&env, policy_id, &policy);

        emit_event_with(
            &env,
            symbol_short!("POLICY"),
            symbol_short!("GOV_UPD"),
            &policy_id,
        );
    }

    // #609: DAO-governed parameter update. Same trust model as
    // `apply_governance_update` — only the registered Governance contract may call.
    pub fn apply_governance_params(env: Env, params: PolicyParams) {
        let governance_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::GovernanceContract)
            .expect("Governance contract not set");
        governance_contract.require_auth();

        if params.max_coverage_amount <= 0 || params.min_premium_amount < 0 {
            panic!("Invalid policy params");
        }

        env.storage()
            .instance()
            .set(&DataKey::PolicyParams, &params);

        emit_event_with(
            &env,
            symbol_short!("POLICY"),
            symbol_short!("PARAMS"),
            &(params.max_coverage_amount, params.min_premium_amount),
        );
    }

    pub fn update_claimed(env: Env, policy_id: u64, amount: i128) {
        let claims_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::ClaimsContract)
            .expect("Claims contract not set");
        claims_contract.require_auth();

        let mut policy = get_policy_inner(&env, policy_id);
        policy.total_claimed += amount;

        if policy.total_claimed > policy.coverage_amount {
            panic!("Total claimed exceeds coverage amount");
        }

        set_policy(&env, policy_id, &policy);
    }

    pub fn expire_policy(env: Env, policy_id: u64) {
        let mut policy = get_policy_inner(&env, policy_id);

        let now = env.ledger().timestamp();
        let expiry = policy.start_time + (policy.duration_days as u64 * 86400);

        if now < expiry {
            panic!("Policy not yet expired");
        }

        policy.status = PolicyStatus::Expired;
        set_policy(&env, policy_id, &policy);

        emit_event_with(
            &env,
            symbol_short!("POLICY"),
            symbol_short!("EXPIRED"),
            &(policy_id, policy.holder),
        );
    }

    pub fn get_stats(env: Env) -> u64 {
        get_policy_counter(&env)
    }

    pub fn update_cl(env: Env, policy_id: u64, amount: i128) {
        Self::update_claimed(env, policy_id, amount)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env};

    fn setup() -> (Env, Address, Address, Address) {
        let env = Env::default();
        let contract = env.register_contract(None, PolicyContract);
        let admin = Address::generate(&env);
        let risk_pool = Address::generate(&env);
        env.mock_all_auths();
        (env, contract, admin, risk_pool)
    }

    #[test]
    fn test_initialize_sets_admin_role() {
        let (env, contract, admin, risk) = setup();
        env.as_contract(&contract, || {
            PolicyContract::initialize(env.clone(), admin.clone(), risk);
        });
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
    fn test_non_admin_set_claims_contract_rejected() {
        let (env, contract, admin, risk) = setup();
        let attacker = Address::generate(&env);
        env.as_contract(&contract, || {
            PolicyContract::initialize(env.clone(), admin.clone(), risk);
        });
        env.as_contract(&contract, || {
            PolicyContract::set_claims_contract(env.clone(), attacker);
        });
    }

    #[test]
    #[should_panic(expected = "unauthorized")]
    fn test_non_admin_issue_policy_rejected() {
        let (env, contract, admin, risk) = setup();
        env.as_contract(&contract, || {
            PolicyContract::initialize(env.clone(), admin.clone(), risk);
        });
        let holder = Address::generate(&env);
        env.as_contract(&contract, || {
            PolicyContract::issue_policy(env.clone(), holder, 1000, 100, 365, PolicyType::Standard);
        });
    }

    // #609: apply_governance_update / apply_governance_params coverage.

    fn seed_policy(
        env: &Env,
        contract: &Address,
        governance: &Address,
        holder: &Address,
        risk_pool: &Address,
        total_claimed: i128,
    ) {
        env.as_contract(contract, || {
            env.storage()
                .instance()
                .set(&DataKey::GovernanceContract, governance);
            let policy = InsurancePolicy {
                policy_id: 1,
                holder: holder.clone(),
                coverage_amount: 1000,
                premium_amount: 100,
                start_time: 0,
                duration_days: 365,
                policy_type: PolicyType::Standard,
                status: PolicyStatus::Active,
                risk_pool: risk_pool.clone(),
                total_claimed,
            };
            set_policy(env, 1, &policy);
        });
    }

    #[test]
    fn test_apply_governance_update_patches_policy() {
        let (env, contract, _admin, risk) = setup();
        let governance = Address::generate(&env);
        let holder = Address::generate(&env);
        seed_policy(&env, &contract, &governance, &holder, &risk, 0);

        let patch = PolicyPatch {
            coverage_amount: Some(5000),
            premium_amount: Some(200),
            status: StatusPatch::Set(PolicyStatus::Cancelled),
        };
        env.as_contract(&contract, || {
            PolicyContract::apply_governance_update(env.clone(), 1, patch);
        });

        env.as_contract(&contract, || {
            let policy = PolicyContract::get_policy(env.clone(), 1);
            assert_eq!(policy.coverage_amount, 5000);
            assert_eq!(policy.premium_amount, 200);
            assert_eq!(policy.status, PolicyStatus::Cancelled);
        });
    }

    #[test]
    #[should_panic(expected = "Invalid coverage_amount in policy patch")]
    fn test_apply_governance_update_rejects_invalid_patch() {
        let (env, contract, _admin, risk) = setup();
        let governance = Address::generate(&env);
        let holder = Address::generate(&env);
        seed_policy(&env, &contract, &governance, &holder, &risk, 0);

        let patch = PolicyPatch {
            coverage_amount: Some(-5),
            premium_amount: None,
            status: StatusPatch::Keep,
        };
        env.as_contract(&contract, || {
            PolicyContract::apply_governance_update(env.clone(), 1, patch);
        });
    }

    #[test]
    #[should_panic]
    fn test_apply_governance_update_rejects_non_governance_caller() {
        // No env.mock_all_auths() here: `governance.require_auth()` must be
        // rejected because nothing authorized it for this invocation.
        let env = Env::default();
        let contract = env.register_contract(None, PolicyContract);
        let governance = Address::generate(&env);
        let holder = Address::generate(&env);
        let risk = Address::generate(&env);
        seed_policy(&env, &contract, &governance, &holder, &risk, 0);

        let patch = PolicyPatch {
            coverage_amount: Some(2000),
            premium_amount: None,
            status: StatusPatch::Keep,
        };
        env.as_contract(&contract, || {
            PolicyContract::apply_governance_update(env.clone(), 1, patch);
        });
    }

    #[test]
    #[should_panic(expected = "Coverage amount exceeds DAO-governed maximum")]
    fn test_policy_params_enforced_on_issue_policy() {
        let (env, contract, admin, risk) = setup();
        let governance = Address::generate(&env);
        env.as_contract(&contract, || {
            PolicyContract::initialize(env.clone(), admin.clone(), risk);
            // issue_policy's Admin gate checks the contract's own address, so
            // it must hold the Admin role itself.
            PolicyContract::set_role(env.clone(), contract.clone(), AccessControlRole::Admin);
            PolicyContract::set_governance_contract(env.clone(), governance.clone());
        });

        let params = PolicyParams {
            max_coverage_amount: 500,
            min_premium_amount: 50,
        };
        env.as_contract(&contract, || {
            PolicyContract::apply_governance_params(env.clone(), params);
        });

        let holder = Address::generate(&env);
        env.as_contract(&contract, || {
            PolicyContract::issue_policy(env.clone(), holder, 600, 100, 365, PolicyType::Standard);
        });
    }
}
