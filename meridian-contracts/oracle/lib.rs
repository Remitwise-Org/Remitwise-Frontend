#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, symbol_short, Symbol};
use stellar_insured_lib::OracleError;

const ADMIN: Symbol = symbol_short!("ADMIN");

#[contract]
pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    /// Initialize the contract with a real admin address.
    /// Prevents the [0x0; 32] zero-address backdoor.
    pub fn init(env: Env, admin: Address) -> Result<(), OracleError> {
        if env.storage().instance().has(&ADMIN) {
            return Err(OracleError::AlreadyInitialized);
        }
        env.storage().instance().set(&ADMIN, &admin);
        Ok(())
    }

    /// Admin-only function example
    pub fn update_data(env: Env, value: u32) -> Result<(), OracleError> {
        let admin: Address = env.storage().instance().get(&ADMIN)
            .ok_or(OracleError::NotInitialized)?;
        admin.require_auth();
        
        // ... update logic
        Ok(())
    }
}

// RUTHLESS FIX: Explicitly do NOT implement the Default trait.
// This forces the developer to handle initialization manually.