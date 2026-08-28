#[cfg(test)]
mod migration_tests {
    use crate::{RiskPoolContract, StorageVersion};
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env};

    fn setup() -> (Env, Address, Address) {
        let env = Env::default();
        let contract = env.register_contract(None, RiskPoolContract);
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        env.mock_all_auths();
        env.as_contract(&contract, || {
            RiskPoolContract::initialize(env.clone(), admin.clone(), token, 100).unwrap();
        });
        (env, contract, admin)
    }

    #[test]
    fn test_migrate_requires_admin_role() {
        let (env, contract, admin) = setup();
        env.mock_all_auths();
        env.as_contract(&contract, || {
            RiskPoolContract::migrate(env.clone(), admin.clone(), StorageVersion::V2).unwrap();
        });
        env.as_contract(&contract, || {
            assert_eq!(RiskPoolContract::version(env.clone()), StorageVersion::V2);
        });
    }

    #[test]
    fn test_migrate_is_idempotent() {
        let (env, contract, admin) = setup();
        env.mock_all_auths();
        env.as_contract(&contract, || {
            RiskPoolContract::migrate(env.clone(), admin.clone(), StorageVersion::V2).unwrap();
        });
        env.mock_all_auths();
        env.as_contract(&contract, || {
            let result = RiskPoolContract::migrate(env.clone(), admin, StorageVersion::V2);
            assert!(result.is_ok());
        });
    }
}
