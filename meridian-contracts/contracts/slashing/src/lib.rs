#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec,
};
use stellar_insured_lib::access_control::{self, AccessControlRole};
use stellar_insured_lib::circuit_breaker;
use stellar_insured_lib::events::emit_event_with;
use stellar_insured_lib::state_root::get_state_root;

// Maximum slashing history entries per (target, role) to prevent storage bloat (#380)
const MAX_HISTORY: u32 = 50;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Governance,
    RiskPool,
    PenaltyParams(Symbol),
    ViolationCount(Address, Symbol),
    History(Address, Symbol),
    SlashableRoles,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PenaltyParams {
    pub percentage: u32,
    pub multiplier: u32,
    pub cooldown_seconds: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SlashingRecord {
    pub target: Address,
    pub role: Symbol,
    pub reason: String,
    pub amount: i128,
    pub timestamp: u64,
}

// --- Storage helpers (#378: data access abstraction) ---

fn is_paused(env: &Env) -> bool {
    circuit_breaker::is_paused(env)
}

fn get_slashable_roles(env: &Env) -> Vec<Symbol> {
    env.storage()
        .instance()
        .get(&DataKey::SlashableRoles)
        .unwrap_or(Vec::new(env))
}

fn get_violation_count_inner(env: &Env, target: &Address, role: &Symbol) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::ViolationCount(target.clone(), role.clone()))
        .unwrap_or(0)
}

fn get_history_inner(env: &Env, target: &Address, role: &Symbol) -> Vec<SlashingRecord> {
    env.storage()
        .persistent()
        .get(&DataKey::History(target.clone(), role.clone()))
        .unwrap_or(Vec::new(env))
}

fn set_history(env: &Env, target: &Address, role: &Symbol, history: &Vec<SlashingRecord>) {
    env.storage()
        .persistent()
        .set(&DataKey::History(target.clone(), role.clone()), history);
}

// --------------------------------------------------------

#[contract]
pub struct SlashingContract;

#[contractimpl]
impl SlashingContract {
    pub fn initialize(env: Env, admin: Address, governance: Address, risk_pool: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Governance, &governance);
        env.storage().instance().set(&DataKey::RiskPool, &risk_pool);
        env.storage()
            .instance()
            .set(&DataKey::SlashableRoles, &Vec::<Symbol>::new(&env));
        access_control::init_access_control(&env, &admin);
        access_control::set_role(&env, &admin, &governance, AccessControlRole::Governance);
        circuit_breaker::init(&env);

        emit_event_with(
            &env,
            symbol_short!("SLASH"),
            symbol_short!("INIT"),
            &(admin, governance, risk_pool),
        );
    }

    pub fn set_role(env: Env, addr: Address, role: AccessControlRole) {
        access_control::set_role(&env, &env.current_contract_address(), &addr, role);
    }

    pub fn configure_penalty_parameters(env: Env, role: Symbol, params: PenaltyParams) {
        let caller = env.current_contract_address();
        access_control::require_role(&env, &caller, &AccessControlRole::Admin);

        env.storage()
            .persistent()
            .set(&DataKey::PenaltyParams(role.clone()), &params);

        emit_event_with(
            &env,
            symbol_short!("SLASH"),
            symbol_short!("CONFIG"),
            &(role.clone(), params.percentage, params.multiplier),
        );

        emit_event_with(
            &env,
            symbol_short!("SLASH"),
            symbol_short!("CFG_PEN"),
            &role,
        );
    }

    pub fn slash_funds(env: Env, target: Address, role: Symbol, reason: String, amount: i128) {
        let caller = env.current_contract_address();
        access_control::require_role(&env, &caller, &AccessControlRole::Governance);

        if is_paused(&env) {
            panic!("Contract paused");
        }

        if !Self::can_be_slashed(env.clone(), target.clone(), role.clone()) {
            panic!("Target not eligible for slashing");
        }

        let mut count = get_violation_count_inner(&env, &target, &role);
        count += 1;
        env.storage().persistent().set(
            &DataKey::ViolationCount(target.clone(), role.clone()),
            &count,
        );

        let record = SlashingRecord {
            target: target.clone(),
            role: role.clone(),
            reason,
            amount,
            timestamp: env.ledger().timestamp(),
        };

        // #380: cap history to MAX_HISTORY entries to prevent storage bloat
        let mut history = get_history_inner(&env, &target, &role);
        if history.len() >= MAX_HISTORY {
            // Remove oldest entry (index 0)
            let mut trimmed = Vec::new(&env);
            for i in 1..history.len() {
                trimmed.push_back(history.get(i).unwrap());
            }
            history = trimmed;
        }
        history.push_back(record);
        set_history(&env, &target, &role, &history);

        emit_event_with(
            &env,
            symbol_short!("SLASH"),
            symbol_short!("SLASHED"),
            &(target.clone(), role.clone(), amount),
        );
    }

    pub fn add_slashable_role(env: Env, role: Symbol) {
        let caller = env.current_contract_address();
        access_control::require_role(&env, &caller, &AccessControlRole::Admin);

        let mut roles = get_slashable_roles(&env);
        if !roles.contains(role.clone()) {
            roles.push_back(role.clone());
            env.storage()
                .instance()
                .set(&DataKey::SlashableRoles, &roles);

            emit_event_with(
                &env,
                symbol_short!("SLASH"),
                symbol_short!("ROLE_ADD"),
                &role.clone(),
            );
        }

        emit_event_with(
            &env,
            symbol_short!("SLASH"),
            symbol_short!("ROLE_ADD"),
            &role,
        );
    }

    pub fn remove_slashable_role(env: Env, role: Symbol) {
        let caller = env.current_contract_address();
        access_control::require_role(&env, &caller, &AccessControlRole::Admin);

        let roles = get_slashable_roles(&env);
        let mut new_roles = Vec::new(&env);
        for r in roles.iter() {
            if r != role {
                new_roles.push_back(r);
            }
        }
        env.storage()
            .instance()
            .set(&DataKey::SlashableRoles, &new_roles);

        emit_event_with(
            &env,
            symbol_short!("SLASH"),
            symbol_short!("ROLE_RM"),
            &role.clone(),
        );

        emit_event_with(
            &env,
            symbol_short!("SLASH"),
            symbol_short!("ROLE_RM"),
            &role,
        );
    }

    pub fn pause(env: Env, governance: Address, duration_seconds: u64) {
        circuit_breaker::pause(&env, &governance, duration_seconds);
    }

    pub fn resume(env: Env, admin: Address) {
        circuit_breaker::resume(&env, &admin);
    }

    pub fn emergency_pause(env: Env, governance: Address) {
        circuit_breaker::emergency_pause(&env, &governance);
    }

    pub fn is_paused(env: Env) -> bool {
        circuit_breaker::is_paused(&env)
    }
}

#[contractimpl]
impl SlashingContract {
    pub fn get_slashing_history(env: Env, target: Address, role: Symbol) -> Vec<SlashingRecord> {
        get_history_inner(&env, &target, &role)
    }

    pub fn get_state_root(env: Env) -> soroban_sdk::BytesN<32> {
        get_state_root(&env)
    }

    pub fn get_violation_count(env: Env, target: Address, role: Symbol) -> u32 {
        get_violation_count_inner(&env, &target, &role)
    }

    pub fn can_be_slashed(env: Env, target: Address, role: Symbol) -> bool {
        let roles = get_slashable_roles(&env);
        if !roles.contains(role.clone()) {
            return false;
        }

        if let Some(params) = env
            .storage()
            .persistent()
            .get::<DataKey, PenaltyParams>(&DataKey::PenaltyParams(role.clone()))
        {
            let history = get_history_inner(&env, &target, &role);
            if let Some(last) = history.last() {
                if env.ledger().timestamp() < last.timestamp + params.cooldown_seconds {
                    return false;
                }
            }
        }

        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env};

    fn setup() -> (Env, Address, Address, Address) {
        let env = Env::default();
        let contract = env.register_contract(None, SlashingContract);
        let admin = Address::generate(&env);
        let governance = Address::generate(&env);
        let risk_pool = Address::generate(&env);
        env.mock_all_auths();
        env.as_contract(&contract, || {
            SlashingContract::initialize(env.clone(), admin.clone(), governance.clone(), risk_pool);
        });
        (env, contract, admin, governance)
    }

    #[test]
    fn test_initialize_sets_roles() {
        let (env, contract, admin, governance) = setup();
        env.as_contract(&contract, || {
            assert!(access_control::has_role(
                &env,
                &admin,
                &AccessControlRole::Admin
            ));
            assert!(access_control::has_role(
                &env,
                &governance,
                &AccessControlRole::Governance
            ));
        });
    }

    #[test]
    #[should_panic(expected = "unauthorized")]
    fn test_non_governance_slash_rejected() {
        let (env, contract, _admin, _governance) = setup();
        let attacker = Address::generate(&env);
        let target = Address::generate(&env);
        env.as_contract(&contract, || {
            SlashingContract::slash_funds(
                env.clone(),
                target,
                symbol_short!("test"),
                String::from_str(&env, "reason"),
                100,
            );
        });
    }
}
