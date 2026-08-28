#[cfg(test)]
mod access_control_tests {
    use crate::ClaimsContract;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env};
    use stellar_insured_lib::access_control::{self, AccessControlRole};

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
    fn test_admin_role_granted_on_init() {
        let (env, contract, admin, policy, risk) = setup();
        env.as_contract(&contract, || {
            ClaimsContract::initialize(env.clone(), admin.clone(), policy, risk);
        });
        env.as_contract(&contract, || {
            assert!(access_control::has_role(
                &env,
                &admin,
                &AccessControlRole::Admin
            ));
            assert!(!access_control::has_role(
                &env,
                &admin,
                &AccessControlRole::Claims
            ));
            assert!(!access_control::has_role(
                &env,
                &admin,
                &AccessControlRole::Governance
            ));
        });
    }

    #[test]
    fn test_set_grants_claims_role() {
        let (env, contract, admin, policy, risk) = setup();
        let claims_addr = Address::generate(&env);
        env.as_contract(&contract, || {
            ClaimsContract::initialize(env.clone(), admin.clone(), policy, risk);
            ClaimsContract::set_role(env.clone(), claims_addr.clone(), AccessControlRole::Claims);
        });
        env.as_contract(&contract, || {
            assert!(access_control::has_role(
                &env,
                &claims_addr,
                &AccessControlRole::Claims
            ));
        });
    }

    #[test]
    #[should_panic]
    fn test_non_admin_cannot_set_role() {
        let env = Env::default();
        let contract = env.register_contract(None, ClaimsContract);
        let admin = Address::generate(&env);
        let policy_contract = Address::generate(&env);
        let risk_pool = Address::generate(&env);
        let target = Address::generate(&env);
        env.as_contract(&contract, || {
            ClaimsContract::initialize(env.clone(), admin.clone(), policy_contract, risk_pool);
        });
        // Without mock_all_auths, the require_auth() inside set_role
        // fails because the stored admin hasn't authorized this invocation.
        env.as_contract(&contract, || {
            ClaimsContract::set_role(env.clone(), target, AccessControlRole::Claims);
        });
    }

    #[test]
    #[should_panic(expected = "unauthorized")]
    fn test_unauthorized_address_cannot_start_review() {
        let (env, contract, admin, policy, risk) = setup();
        env.as_contract(&contract, || {
            ClaimsContract::initialize(env.clone(), admin.clone(), policy, risk);
        });
        env.as_contract(&contract, || {
            ClaimsContract::start_review(env.clone(), 1);
        });
    }

    #[test]
    #[should_panic(expected = "unauthorized")]
    fn test_unauthorized_address_cannot_approve_claim() {
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
    fn test_unauthorized_address_cannot_reject_claim() {
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
    fn test_unauthorized_address_cannot_settle_claim() {
        let (env, contract, admin, policy, risk) = setup();
        env.as_contract(&contract, || {
            ClaimsContract::initialize(env.clone(), admin.clone(), policy, risk);
        });
        env.as_contract(&contract, || {
            ClaimsContract::settle_claim(env.clone(), 1);
        });
    }

    #[test]
    fn test_role_revoke_removes_access() {
        let (env, contract, admin, policy, risk) = setup();
        let claims_addr = Address::generate(&env);
        env.as_contract(&contract, || {
            ClaimsContract::initialize(env.clone(), admin.clone(), policy, risk);
            ClaimsContract::set_role(env.clone(), claims_addr.clone(), AccessControlRole::Claims);
            assert!(access_control::has_role(
                &env,
                &claims_addr,
                &AccessControlRole::Claims
            ));
        });

        env.as_contract(&contract, || {
            access_control::revoke_role(&env, &admin, &claims_addr, AccessControlRole::Claims);
            assert!(!access_control::has_role(
                &env,
                &claims_addr,
                &AccessControlRole::Claims
            ));
        });
    }

    #[test]
    fn test_all_role_variants_exist() {
        let _admin = AccessControlRole::Admin;
        let _governance = AccessControlRole::Governance;
        let _claims = AccessControlRole::Claims;
        let _policy = AccessControlRole::Policy;
        let _risk_pool = AccessControlRole::RiskPool;
        let _slashing = AccessControlRole::Slashing;
    }

    #[test]
    fn test_escrow_init_grants_admin_role() {
        use propchain_escrow::AdvancedEscrow;

        let env = Env::default();
        let contract = env.register_contract(None, AdvancedEscrow);
        let admin = Address::generate(&env);

        env.mock_all_auths();
        env.as_contract(&contract, || {
            AdvancedEscrow::init(env.clone(), admin.clone()).unwrap();
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
    fn test_escrow_set_role_works() {
        use propchain_escrow::AdvancedEscrow;

        let env = Env::default();
        let contract = env.register_contract(None, AdvancedEscrow);
        let admin = Address::generate(&env);
        let new_admin = Address::generate(&env);

        env.mock_all_auths();
        env.as_contract(&contract, || {
            AdvancedEscrow::init(env.clone(), admin.clone()).unwrap();
        });

        env.as_contract(&contract, || {
            AdvancedEscrow::set_role(env.clone(), new_admin.clone(), AccessControlRole::Admin)
                .unwrap();
        });

        env.as_contract(&contract, || {
            assert!(access_control::has_role(
                &env,
                &new_admin,
                &AccessControlRole::Admin
            ));
        });
    }

    #[test]
    fn test_policy_contract_init_grants_admin_role() {
        use stellar_insured_policy::PolicyContract;

        let env = Env::default();
        let contract = env.register_contract(None, PolicyContract);
        let admin = Address::generate(&env);
        let risk_pool = Address::generate(&env);

        env.mock_all_auths();
        env.as_contract(&contract, || {
            PolicyContract::initialize(env.clone(), admin.clone(), risk_pool);
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
    fn test_risk_pool_init_grants_admin_role() {
        use stellar_insured_risk_pool::RiskPoolContract;

        let env = Env::default();
        let contract = env.register_contract(None, RiskPoolContract);
        let admin = Address::generate(&env);
        let token = Address::generate(&env);

        env.mock_all_auths();
        env.as_contract(&contract, || {
            RiskPoolContract::initialize(env.clone(), admin, token, 100).unwrap();
        });
    }

    #[test]
    fn test_governance_init_grants_admin_role() {
        use stellar_insured_governance::GovernanceContract;

        let env = Env::default();
        let contract = env.register_contract(None, GovernanceContract);
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let slashing = Address::generate(&env);
        let claims = Address::generate(&env);
        let risk_pool = Address::generate(&env);
        let policy = Address::generate(&env);

        env.mock_all_auths();
        env.as_contract(&contract, || {
            GovernanceContract::initialize(
                env.clone(),
                admin.clone(),
                token,
                slashing,
                1000,
                claims,
                risk_pool,
                policy,
            )
            .unwrap();
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
    fn test_slashing_init_grants_admin_role() {
        use stellar_insured_slashing::SlashingContract;

        let env = Env::default();
        let contract = env.register_contract(None, SlashingContract);
        let admin = Address::generate(&env);
        let governance = Address::generate(&env);
        let risk_pool = Address::generate(&env);

        env.mock_all_auths();
        env.as_contract(&contract, || {
            SlashingContract::initialize(env.clone(), admin.clone(), governance, risk_pool);
        });

        env.as_contract(&contract, || {
            assert!(access_control::has_role(
                &env,
                &admin,
                &AccessControlRole::Admin
            ));
        });
    }
}
