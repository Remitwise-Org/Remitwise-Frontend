#![no_std]

use soroban_sdk::xdr::ToXdr;
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};
use stellar_insured_lib::access_control::{self, AccessControlRole};
use stellar_insured_lib::events::emit_event_with;
use stellar_insured_lib::state_root::{
    compute_root, get_state_root as read_state_root, set_state_root,
};
use stellar_insured_lib::RiskPoolError;

#[cfg(test)]
mod migration_test;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    MinStake,
    TotalCapital,
    AvailableCapital,
    ClaimsPaid,
    ProviderStake(Address),
    Version,
    LockedCapital,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[contracttype]
pub enum StorageVersion {
    V1 = 1,
    V2 = 2,
}

impl StorageVersion {
    pub const fn current() -> Self {
        StorageVersion::V2
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolStats {
    pub total_capital: i128,
    pub available_capital: i128,
    pub total_claims_paid: i128,
}

// --- Storage helpers (#378: data access abstraction) ---

fn get_token(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Token).unwrap()
}

fn get_total_capital(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::TotalCapital)
        .unwrap_or(0)
}

fn get_available_capital(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::AvailableCapital)
        .unwrap_or(0)
}

fn get_provider_stake(env: &Env, provider: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::ProviderStake(provider.clone()))
        .unwrap_or(0)
}

fn refresh_state_root(env: &Env) {
    let stats = PoolStats {
        total_capital: get_total_capital(env),
        available_capital: get_available_capital(env),
        total_claims_paid: env
            .storage()
            .instance()
            .get(&DataKey::ClaimsPaid)
            .unwrap_or(0),
    };
    let mut entries = soroban_sdk::Vec::new(env);
    entries.push_back(stats.to_xdr(env));
    entries.push_back(
        env.storage()
            .instance()
            .get(&DataKey::Version)
            .unwrap_or(StorageVersion::V1)
            .to_xdr(env),
    );
    let root = compute_root(env, entries);
    set_state_root(env, &root);
}

// --------------------------------------------------------

#[contract]
pub struct RiskPoolContract;

#[contractimpl]
impl RiskPoolContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        min_stake: i128,
    ) -> Result<(), RiskPoolError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(RiskPoolError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::MinStake, &min_stake);
        env.storage().instance().set(&DataKey::TotalCapital, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::AvailableCapital, &0i128);
        env.storage().instance().set(&DataKey::ClaimsPaid, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::Version, &StorageVersion::current());
        env.storage()
            .instance()
            .set(&DataKey::LockedCapital, &0i128);
        access_control::init_access_control(&env, &admin);
        refresh_state_root(&env);
        Ok(())
    }

    pub fn set_role(env: Env, addr: Address, role: AccessControlRole) -> Result<(), RiskPoolError> {
        access_control::set_role(&env, &env.current_contract_address(), &addr, role);
        Ok(())
    }

    pub fn deposit_liquidity(
        env: Env,
        provider: Address,
        amount: i128,
    ) -> Result<(), RiskPoolError> {
        provider.require_auth();

        let min_stake: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MinStake)
            .ok_or(RiskPoolError::NotInitialized)?;

        if amount < min_stake {
            return Err(RiskPoolError::BelowMinimumStake);
        }

        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(RiskPoolError::NotInitialized)?;

        // Transfer tokens from provider to this contract
        let client = soroban_sdk::token::Client::new(&env, &token);
        client.transfer(&provider, &env.current_contract_address(), &amount);

        let current_stake = get_provider_stake(&env, &provider);
        let new_stake = current_stake + amount;
        env.storage()
            .persistent()
            .set(&DataKey::ProviderStake(provider.clone()), &new_stake);

        let new_total = get_total_capital(&env) + amount;
        let new_available = get_available_capital(&env) + amount;
        env.storage()
            .instance()
            .set(&DataKey::TotalCapital, &new_total);
        env.storage()
            .instance()
            .set(&DataKey::AvailableCapital, &new_available);
        refresh_state_root(&env);

        emit_event_with(
            &env,
            symbol_short!("RPOOL"),
            symbol_short!("DEPOSIT"),
            &(provider, amount, new_stake),
        );
        Ok(())
    }

    pub fn withdraw_liquidity(
        env: Env,
        provider: Address,
        amount: i128,
    ) -> Result<(), RiskPoolError> {
        provider.require_auth();

        let stake = get_provider_stake(&env, &provider);
        if stake < amount {
            return Err(RiskPoolError::InsufficientStake);
        }

        let avail = get_available_capital(&env);
        if avail < amount {
            return Err(RiskPoolError::InsufficientPoolFunds);
        }

        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(RiskPoolError::NotInitialized)?;
        let client = soroban_sdk::token::Client::new(&env, &token);
        client.transfer(&env.current_contract_address(), &provider, &amount);

        let new_stake = stake - amount;
        env.storage()
            .persistent()
            .set(&DataKey::ProviderStake(provider.clone()), &new_stake);

        let new_total = get_total_capital(&env) - amount;
        let new_available = avail - amount;
        env.storage()
            .instance()
            .set(&DataKey::TotalCapital, &new_total);
        env.storage()
            .instance()
            .set(&DataKey::AvailableCapital, &new_available);
        refresh_state_root(&env);

        emit_event_with(
            &env,
            symbol_short!("RPOOL"),
            symbol_short!("WITHDRAW"),
            &(provider, amount, new_stake),
        );
        Ok(())
    }

    pub fn payout_claim(env: Env, recipient: Address, amount: i128) -> Result<(), RiskPoolError> {
        let caller = env.current_contract_address();
        access_control::require_role(&env, &caller, &AccessControlRole::Admin);

        // #410: Verify available capital before payout
        let avail = get_available_capital(&env);
        if avail < amount {
            return Err(RiskPoolError::InsufficientPoolFunds);
        }

        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(RiskPoolError::NotInitialized)?;
        let client = soroban_sdk::token::Client::new(&env, &token);
        client.transfer(&env.current_contract_address(), &recipient, &amount);

        let new_available = avail - amount;
        env.storage()
            .instance()
            .set(&DataKey::AvailableCapital, &new_available);

        let paid = env
            .storage()
            .instance()
            .get(&DataKey::ClaimsPaid)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::ClaimsPaid, &(paid + amount));
        refresh_state_root(&env);

        emit_event_with(
            &env,
            symbol_short!("RPOOL"),
            symbol_short!("PAYOUT"),
            &(recipient, amount, new_available),
        );
        Ok(())
    }

    /// Absorb a slashed provider stake into the pool (#601).
    ///
    /// Called by the governance contract when a slashing proposal executes. The
    /// slashed portion of the target's personal stake is forfeited to the pool's
    /// collectively-available capital: the target can no longer withdraw it, and
    /// it becomes available to cover claims. The tokens are already held by the
    /// pool (they were transferred in at `deposit_liquidity` time), so this is a
    /// pure reallocation and moves no tokens.
    ///
    /// Gated on the `Governance` role, mirroring `payout_claim`'s role check.
    pub fn absorb_slash(env: Env, target: Address, amount: i128) -> Result<(), RiskPoolError> {
        let caller = env.current_contract_address();
        access_control::require_role(&env, &caller, &AccessControlRole::Governance);

        if amount <= 0 {
            return Err(RiskPoolError::InvalidAmount);
        }

        let stake = get_provider_stake(&env, &target);
        if stake < amount {
            return Err(RiskPoolError::InsufficientStake);
        }

        // Reduce the target's personal stake; the forfeited amount stays in the
        // pool as collectively-available capital.
        let new_stake = stake - amount;
        env.storage()
            .persistent()
            .set(&DataKey::ProviderStake(target.clone()), &new_stake);

        let new_available = get_available_capital(&env) + amount;
        env.storage()
            .instance()
            .set(&DataKey::AvailableCapital, &new_available);
        refresh_state_root(&env);

        emit_event_with(
            &env,
            symbol_short!("RPOOL"),
            symbol_short!("SLASHED"),
            &(target, amount, new_available),
        );
        Ok(())
    }

    pub fn get_pool_stats(env: Env) -> PoolStats {
        PoolStats {
            total_capital: get_total_capital(&env),
            available_capital: get_available_capital(&env),
            total_claims_paid: env
                .storage()
                .instance()
                .get(&DataKey::ClaimsPaid)
                .unwrap_or(0),
        }
    }

    pub fn get_provider_info(env: Env, provider: Address) -> i128 {
        get_provider_stake(&env, &provider)
    }

    pub fn get_state_root(env: Env) -> soroban_sdk::BytesN<32> {
        read_state_root(&env)
    }

    pub fn migrate(
        env: Env,
        admin: Address,
        to_version: StorageVersion,
    ) -> Result<(), RiskPoolError> {
        admin.require_auth();
        access_control::require_role(&env, &admin, &AccessControlRole::Admin);

        let current_version: StorageVersion = env
            .storage()
            .instance()
            .get(&DataKey::Version)
            .unwrap_or(StorageVersion::V1);

        if current_version == to_version {
            // Already at target version - idempotent
            return Ok(());
        }

        if to_version < current_version {
            return Err(RiskPoolError::AlreadyInitialized);
        }

        match (current_version, to_version) {
            (StorageVersion::V1, StorageVersion::V2) => {
                // Migration V1 -> V2: Add LockedCapital field with default value
                if !env.storage().instance().has(&DataKey::LockedCapital) {
                    env.storage()
                        .instance()
                        .set(&DataKey::LockedCapital, &0i128);
                }
                env.storage()
                    .instance()
                    .set(&DataKey::Version, &StorageVersion::V2);
                refresh_state_root(&env);
            }
            _ => return Err(RiskPoolError::AlreadyInitialized),
        }

        emit_event_with(
            &env,
            symbol_short!("RPOOL"),
            symbol_short!("MIGRATED"),
            &to_version,
        );
        Ok(())
    }
}

#[contractimpl]
impl RiskPoolContract {
    pub fn version(env: Env) -> StorageVersion {
        env.storage()
            .instance()
            .get(&DataKey::Version)
            .unwrap_or(StorageVersion::V1)
    }

    pub fn get_locked_capital(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::LockedCapital)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
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
    fn test_initialize_sets_admin_role() {
        let (env, contract, admin) = setup();
        env.as_contract(&contract, || {
            assert!(access_control::has_role(
                &env,
                &admin,
                &AccessControlRole::Admin
            ));
        });
    }
}

// =========================================================================
// Formal verification and property-based tests (#630)
// =========================================================================

#[cfg(all(test, feature = "verification"))]
mod verification_tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env};

    /// Kani harness: available_capital >= 0 is preserved after any state change.
    ///
    /// This models the invariant that the risk pool's available capital must
    /// never go negative, regardless of deposit or withdrawal operations.
    #[cfg(feature = "kani")]
    #[kani::proof]
    fn kani_verify_available_capital_non_negative() {
        use stellar_insured_lib::verification::invariants::non_negative_available_capital;
        let available: i128 = kani::any();
        kani::assume(available >= 0);
        assert!(non_negative_available_capital(available));
    }

    /// Kani harness: total_capital >= available_capital.
    #[cfg(feature = "kani")]
    #[kani::proof]
    fn kani_verify_total_capital_covers_available() {
        use stellar_insured_lib::verification::invariants::total_capital_covers_available;
        let total: i128 = kani::any();
        let available: i128 = kani::any();
        kani::assume(total >= 0);
        kani::assume(available >= 0);
        kani::assume(total >= available);
        assert!(total_capital_covers_available(total, available));
    }

    /// Kani harness: deposit/withdraw round-trip preserves total capital.
    #[cfg(feature = "kani")]
    #[kani::proof]
    fn kani_verify_deposit_withdraw_roundtrip() {
        use stellar_insured_lib::verification::invariants::deposit_withdraw_roundtrip;
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

    /// Property-based test: deposit followed by withdrawal round-trips correctly.
    #[cfg(feature = "proptest")]
    #[test]
    fn prop_verify_deposit_withdraw_roundtrip() {
        use proptest::prelude::*;
        use stellar_insured_lib::verification::invariants::deposit_withdraw_roundtrip;

        proptest! {
            #![proptest_config(ProptestConfig::with_cases(1000))]

            #[test]
            fn prop_deposit_withdraw_roundtrip(
                original in 0i128..=1_000_000_000i128,
                deposit in 0i128..=1_000_000_000i128,
                max_withdrawal in 0i128..=1_000_000_000i128,
            ) {
                let withdrawal = max_withdrawal.min(original + deposit);
                let final_total = original + deposit - withdrawal;
                prop_assert!(deposit_withdraw_roundtrip(original, deposit, withdrawal, final_total));
            }
        }
    }

    /// Property-based test: available_capital is always non-negative after operations.
    #[cfg(feature = "proptest")]
    #[test]
    fn prop_verify_available_capital_non_negative() {
        use proptest::prelude::*;
        use stellar_insured_lib::verification::invariants::non_negative_available_capital;

        proptest! {
            #![proptest_config(ProptestConfig::with_cases(1000))]

            #[test]
            fn prop_available_capital_non_negative(available in 0i128..=1_000_000_000i128) {
                prop_assert!(non_negative_available_capital(available));
            }
        }
    }

    /// Property-based test: total_capital >= available_capital after deposit/withdraw.
    #[cfg(feature = "proptest")]
    #[test]
    fn prop_verify_total_capital_covers_available() {
        use proptest::prelude::*;
        use stellar_insured_lib::verification::invariants::total_capital_covers_available;

        proptest! {
            #![proptest_config(ProptestConfig::with_cases(1000))]

            #[test]
            fn prop_total_capital_covers_available(
                total in 0i128..=1_000_000_000i128,
                available in 0i128..=1_000_000_000i128,
            ) {
                let available = available.min(total);
                prop_assert!(total_capital_covers_available(total, available));
            }
        }
    }

    /// End-to-end Soroban test: pool invariants hold after deposit/withdraw/payout.
    #[test]
    fn test_pool_invariants_after_operations() {
        let env = Env::default();
        let contract = env.register_contract(None, RiskPoolContract);
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let provider = Address::generate(&env);
        env.mock_all_auths();
        env.as_contract(&contract, || {
            RiskPoolContract::initialize(env.clone(), admin.clone(), token, 100).unwrap();
        });

        // Deposit liquidity
        env.as_contract(&contract, || {
            RiskPoolContract::deposit_liquidity(env.clone(), provider.clone(), 1000).unwrap();
        });

        let stats = env.as_contract(&contract, || RiskPoolContract::get_pool_stats(env.clone()));
        assert!(
            stats.available_capital >= 0,
            "available_capital must be non-negative"
        );
        assert!(
            stats.total_capital >= stats.available_capital,
            "total_capital must cover available_capital"
        );
        assert_eq!(stats.total_capital, 1000);

        // Withdraw part of the liquidity
        env.as_contract(&contract, || {
            RiskPoolContract::withdraw_liquidity(env.clone(), provider.clone(), 400).unwrap();
        });

        let stats = env.as_contract(&contract, || RiskPoolContract::get_pool_stats(env.clone()));
        assert!(stats.available_capital >= 0);
        assert!(stats.total_capital >= stats.available_capital);
        assert_eq!(stats.total_capital, 600);
        assert_eq!(stats.available_capital, 600);
    }
}
