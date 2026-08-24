#![no_std]

mod storage;
mod types;
mod validation;

#[cfg(test)]
mod migration_test;

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Vec};
use stellar_insured_lib::access_control::{self, AccessControlRole};
use stellar_insured_lib::circuit_breaker;
use stellar_insured_lib::events::emit_event_with;
use stellar_insured_lib::state_root::get_state_root;
use stellar_insured_lib::{EscrowError, ValidationError};

use storage::{DataKey, StorageVersion};
use types::{ApprovalType, EscrowData, EscrowStatus, MultiSigConfig};
use validation::{
    require_future_timestamp, require_non_zero_address, require_non_zero_u64, require_not_paused,
    require_positive_amount, require_valid_multisig,
};

const CONTRACT_VERSION: u32 = 1;
const MAX_PARTICIPANTS: u32 = 10;

#[contract]
pub struct AdvancedEscrow;

#[contractimpl]
impl AdvancedEscrow {
    pub fn init(env: Env, admin: Address) -> Result<(), ValidationError> {
        require_non_zero_address(&admin)?;
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(ValidationError::ZeroAddress);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Version, &StorageVersion::current());
        env.storage().instance().set(&DataKey::EscrowCount, &0u64);
        env.storage().instance().set(&DataKey::FeeBps, &0u32);

        access_control::init_access_control(&env, &admin);
        circuit_breaker::init(&env);

        emit_event_with(&env, symbol_short!("ESCROW"), symbol_short!("INIT"), &admin);
        Ok(())
    }

    pub fn pause(env: Env, governance: Address, duration_seconds: u64) -> Result<(), EscrowError> {
        circuit_breaker::pause(&env, &governance, duration_seconds);
        Ok(())
    }

    pub fn resume(env: Env, admin: Address) -> Result<(), EscrowError> {
        circuit_breaker::resume(&env, &admin);
        Ok(())
    }

    pub fn emergency_pause(env: Env, governance: Address) -> Result<(), EscrowError> {
        circuit_breaker::emergency_pause(&env, &governance);
        Ok(())
    }

    pub fn create_escrow_advanced(
        env: Env,
        property_id: u64,
        amount: i128,
        buyer: Address,
        seller: Address,
        participants: Vec<Address>,
        required_signatures: u32,
        release_time_lock: Option<u64>,
        nonce: u64,
    ) -> Result<u64, EscrowError> {
        require_not_paused(&env).map_err(|_| EscrowError::Unauthorized)?;
        require_non_zero_u64(property_id, "property_id").map_err(|_| EscrowError::InvalidNonce)?;
        require_positive_amount(amount, "amount").map_err(|_| EscrowError::DepositExceedsAmount)?;

        // Nonce validation for replay protection (#349)
        let current_nonce: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::Nonce(buyer.clone()))
            .unwrap_or(0);
        if nonce != current_nonce + 1 {
            return Err(EscrowError::InvalidNonce);
        }
        env.storage()
            .persistent()
            .set(&DataKey::Nonce(buyer.clone()), &nonce);

        if participants.len() > MAX_PARTICIPANTS {
            return Err(EscrowError::TooManyParticipants);
        }
        require_valid_multisig(required_signatures, participants.len())
            .map_err(|_| EscrowError::InvalidStatus)?;
        require_non_zero_address(&buyer).map_err(|_| EscrowError::Unauthorized)?;
        require_non_zero_address(&seller).map_err(|_| EscrowError::Unauthorized)?;
        for participant in participants.iter() {
            require_non_zero_address(&participant).map_err(|_| EscrowError::Unauthorized)?;
        }
        if let Some(time_lock) = release_time_lock {
            require_future_timestamp(time_lock, env.ledger().timestamp(), "release_time_lock")
                .map_err(|_| EscrowError::TimeLockActive)?;
        }

        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::EscrowCount)
            .unwrap_or(0);
        count += 1;
        env.storage().instance().set(&DataKey::EscrowCount, &count);

        let escrow_data = EscrowData {
            id: count,
            property_id,
            buyer,
            seller,
            amount,
            deposited_amount: 0,
            status: EscrowStatus::Created,
            created_at: env.ledger().timestamp(),
            release_time_lock,
            participants: participants.clone(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(count), &escrow_data);

        let config = MultiSigConfig {
            required_signatures,
            signers: participants,
        };
        env.storage()
            .persistent()
            .set(&DataKey::MultiSig(count), &config);

        emit_event_with(
            &env,
            symbol_short!("ESCROW"),
            symbol_short!("CREATED"),
            &(count, property_id, amount),
        );

        Ok(count)
    }

    pub fn deposit_funds(env: Env, escrow_id: u64, amount: i128) -> Result<(), EscrowError> {
        require_not_paused(&env).map_err(|_| EscrowError::Unauthorized)?;
        require_non_zero_u64(escrow_id, "escrow_id").map_err(|_| EscrowError::EscrowNotFound)?;
        require_positive_amount(amount, "amount").map_err(|_| EscrowError::DepositExceedsAmount)?;

        let mut escrow: EscrowData = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .ok_or(EscrowError::EscrowNotFound)?;

        if escrow.status != EscrowStatus::Created && escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidStatus);
        }
        let new_deposit_total = escrow
            .deposited_amount
            .checked_add(amount)
            .ok_or(EscrowError::DepositExceedsAmount)?;
        if new_deposit_total > escrow.amount {
            return Err(EscrowError::DepositExceedsAmount);
        }

        escrow.deposited_amount = new_deposit_total;
        escrow.status = if escrow.deposited_amount >= escrow.amount {
            EscrowStatus::Active
        } else {
            EscrowStatus::Funded
        };

        // Single write after all mutations — avoids intermediate writes (#351).
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);

        emit_event_with(
            &env,
            symbol_short!("ESCROW"),
            symbol_short!("FUNDED"),
            &(escrow_id, amount),
        );
        Ok(())
    }

    pub fn release_funds(env: Env, escrow_id: u64) -> Result<(), EscrowError> {
        require_not_paused(&env).map_err(|_| EscrowError::Unauthorized)?;
        require_non_zero_u64(escrow_id, "escrow_id").map_err(|_| EscrowError::EscrowNotFound)?;

        let mut escrow: EscrowData = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .ok_or(EscrowError::EscrowNotFound)?;

        if escrow.status != EscrowStatus::Active {
            return Err(EscrowError::InvalidStatus);
        }

        if let Some(time_lock) = escrow.release_time_lock {
            if env.ledger().timestamp() < time_lock {
                return Err(EscrowError::TimeLockActive);
            }
        }

        let sig_count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::SigCount(escrow_id, ApprovalType::Release))
            .unwrap_or(0);
        let config: MultiSigConfig = env
            .storage()
            .persistent()
            .get(&DataKey::MultiSig(escrow_id))
            .ok_or(EscrowError::EscrowNotFound)?;

        if sig_count < config.required_signatures {
            return Err(EscrowError::SignatureThresholdNotMet);
        }

        let amount = escrow.deposited_amount;
        escrow.status = EscrowStatus::Released;
        escrow.deposited_amount = 0;
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);

        emit_event_with(
            &env,
            symbol_short!("ESCROW"),
            symbol_short!("RELEASED"),
            &(escrow_id, amount),
        );
        Ok(())
    }

    pub fn sign_approval(
        env: Env,
        escrow_id: u64,
        approval_type: ApprovalType,
        signer: Address,
    ) -> Result<(), EscrowError> {
        require_not_paused(&env).map_err(|_| EscrowError::Unauthorized)?;
        require_non_zero_u64(escrow_id, "escrow_id").map_err(|_| EscrowError::EscrowNotFound)?;
        signer.require_auth();
        require_non_zero_address(&signer).map_err(|_| EscrowError::Unauthorized)?;

        let config: MultiSigConfig = env
            .storage()
            .persistent()
            .get(&DataKey::MultiSig(escrow_id))
            .ok_or(EscrowError::EscrowNotFound)?;

        if !config.signers.contains(signer.clone()) {
            return Err(EscrowError::Unauthorized);
        }

        if env.storage().persistent().has(&DataKey::Signature(
            escrow_id,
            approval_type,
            signer.clone(),
        )) {
            return Err(EscrowError::AlreadySigned);
        }

        env.storage().persistent().set(
            &DataKey::Signature(escrow_id, approval_type, signer.clone()),
            &true,
        );

        // Read-increment-write in one place; no separate read before the set (#351).
        let mut count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::SigCount(escrow_id, approval_type))
            .unwrap_or(0);
        count += 1;
        env.storage()
            .persistent()
            .set(&DataKey::SigCount(escrow_id, approval_type), &count);

        emit_event_with(
            &env,
            symbol_short!("ESCROW"),
            symbol_short!("SIGNED"),
            &(escrow_id, signer, count),
        );
        Ok(())
    }

    pub fn migrate(
        env: Env,
        admin: Address,
        to_version: StorageVersion,
    ) -> Result<(), EscrowError> {
        admin.require_auth();
        require_non_zero_address(&admin).map_err(|_| EscrowError::Unauthorized)?;
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
            return Err(EscrowError::InvalidStatus);
        }

        match (current_version, to_version) {
            (StorageVersion::V1, StorageVersion::V2) => {
                // Migration V1 -> V2: Add FeeBps field with default value
                if !env.storage().instance().has(&DataKey::FeeBps) {
                    env.storage().instance().set(&DataKey::FeeBps, &0u32);
                }
                env.storage()
                    .instance()
                    .set(&DataKey::Version, &StorageVersion::V2);
            }
            _ => return Err(EscrowError::InvalidStatus),
        }

        emit_event_with(
            &env,
            symbol_short!("ESCROW"),
            symbol_short!("MIGRATED"),
            &to_version,
        );
        Ok(())
    }
}

#[contractimpl]
impl AdvancedEscrow {
    pub fn version(env: Env) -> StorageVersion {
        env.storage()
            .instance()
            .get(&DataKey::Version)
            .unwrap_or(StorageVersion::V1)
    }

    pub fn get_state_root(env: Env) -> soroban_sdk::BytesN<32> {
        get_state_root(&env)
    }

    pub fn get_fee_bps(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::FeeBps).unwrap_or(0)
    }

    pub fn set_role(env: Env, addr: Address, role: AccessControlRole) -> Result<(), EscrowError> {
        access_control::set_role(&env, &env.current_contract_address(), &addr, role);
        Ok(())
    }

    pub fn is_paused(env: Env) -> bool {
        circuit_breaker::is_paused(&env)
    }

    pub fn get_escrow(env: Env, escrow_id: u64) -> Option<EscrowData> {
        env.storage().persistent().get(&DataKey::Escrow(escrow_id))
    }

    pub fn get_escrow_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::EscrowCount)
            .unwrap_or(0)
    }

    pub fn get_multisig_config(env: Env, escrow_id: u64) -> Option<MultiSigConfig> {
        env.storage()
            .persistent()
            .get(&DataKey::MultiSig(escrow_id))
    }

    pub fn get_sig_count(env: Env, escrow_id: u64, approval_type: ApprovalType) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::SigCount(escrow_id, approval_type))
            .unwrap_or(0)
    }

    pub fn get_nonce(env: Env, address: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::Nonce(address))
            .unwrap_or(0)
    }
}
