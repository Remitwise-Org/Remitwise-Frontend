#![no_std]

mod storage;
mod types;
mod validation;
mod state_root;

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Bytes, Env, String, Vec};
use stellar_insured_lib::access_control::{self, AccessControlRole};
use stellar_insured_lib::circuit_breaker;
use stellar_insured_lib::state_root::get_state_root;

use storage::{DataKey, MAX_HISTORY_ITEMS};
use types::{
    BridgeConfig, BridgeOperationStatus, BridgeTransaction, ChainBridgeInfo,
    MultisigBridgeRequest, PropertyMetadata, RecoveryAction,
};
use validation::{
    require_admin, require_future_timestamp, require_non_zero_address, require_non_zero_u128,
    require_non_zero_u32, require_non_zero_u64, require_not_paused, require_operator,
    require_supported_chain, require_valid_signatures,
};

const CONTRACT_VERSION: u32 = 1;
const MAX_SUPPORTED_CHAINS: u32 = 20;
const MAX_OPERATORS: u32 = 10;

#[contract]
pub struct PropertyBridge;

#[contractimpl]
impl PropertyBridge {
    pub fn init(
        env: Env,
        admin: Address,
        supported_chains: Vec<u32>,
        min_signatures: u32,
        max_signatures: u32,
        default_timeout: u64,
        gas_limit: u64,
        service_fee: i128,
        fee_token: Address, 
        fee_recipient: Address,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        require_non_zero_address(&admin);
        require_non_zero_address(&fee_token);
        require_non_zero_address(&fee_recipient);
        if supported_chains.is_empty() {
            panic!("At least one supported chain is required");
        }
        require_non_zero_u32(min_signatures, "min_signatures");
        require_non_zero_u32(max_signatures, "max_signatures");
        require_non_zero_u64(default_timeout, "default_timeout");
        require_non_zero_u64(gas_limit, "gas_limit");

        if supported_chains.len() > MAX_SUPPORTED_CHAINS {
            panic!("Too many chains");
        }
        for chain_id in supported_chains.iter() {
            require_non_zero_u32(chain_id, "supported_chain");
        }
        if min_signatures > max_signatures {
            panic!("min_signatures cannot exceed max_signatures");
        }

        let config = BridgeConfig {
            supported_chains: supported_chains.clone(),
            min_signatures_required: min_signatures,
            max_signatures_required: max_signatures,
            default_timeout_seconds: default_timeout,
            gas_limit_per_bridge: gas_limit,
            metadata_preservation: true,
            service_fee,
            fee_token,
            fee_recipient,
        };

        env.storage().instance().set(&DataKey::Config, &config);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Version, &CONTRACT_VERSION);
        env.storage().instance().set(&DataKey::ReqCounter, &0u64);
        env.storage().instance().set(&DataKey::TxCounter, &0u64);
        access_control::init_access_control(&env, &admin);
        circuit_breaker::init(&env);

        let mut operators = Vec::new(&env);
        operators.push_back(admin.clone());
        env.storage().instance().set(&DataKey::Operators, &operators);

        for chain_id in supported_chains.iter() {
            let chain_info = ChainBridgeInfo {
                chain_id,
                chain_name: String::from_str(&env, "Chain"),
                bridge_contract_address: None,
                is_active: true,
                gas_multiplier: 100,
                confirmation_blocks: 6,
                supported_tokens: Vec::new(&env),
            };
            env.storage()
                .persistent()
                .set(&DataKey::ChainInfo(chain_id), &chain_info);
        }
        
        env.events().publish(
            (symbol_short!("bridge"), symbol_short!("init")),
            (admin, min_signatures, max_signatures),
        );
    }

    pub fn initiate_bridge_multisig(
        env: Env,
        caller: Address,
        token_id: u64,
        destination_chain: u32,
        recipient: Address,
        required_signatures: u32,
        timeout_seconds: Option<u64>,
        metadata: PropertyMetadata,
        nonce: u64,
    ) -> u64 {
        caller.require_auth();
        require_non_zero_address(&caller);
        require_non_zero_address(&recipient);
        require_non_zero_u64(token_id, "token_id");
        require_non_zero_u32(required_signatures, "required_signatures");
        require_non_zero_u64(metadata.size, "metadata.size");
        require_non_zero_u128(metadata.valuation, "metadata.valuation");
        if let Some(seconds) = timeout_seconds {
            require_non_zero_u64(seconds, "timeout_seconds");
        }

        let current_nonce: u64 = env.storage().persistent().get(&DataKey::Nonce(caller.clone())).unwrap_or(0);
        if nonce != current_nonce + 1 {
            panic!("Invalid nonce");
        }
        env.storage().persistent().set(&DataKey::Nonce(caller.clone()), &nonce);

        let config: BridgeConfig = env.storage().instance().get(&DataKey::Config)
            .unwrap_or_else(|| panic!("Contract not initialized"));

        if config.service_fee > 0 {
            use soroban_sdk::token;
            let client = token::Client::new(&env, &config.fee_token);
            client.transfer(&caller, &config.fee_recipient, &config.service_fee);
        }
        require_not_paused(&env);
        require_supported_chain(&config, destination_chain);
        require_valid_signatures(&config, required_signatures);

        let mut counter: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ReqCounter)
            .unwrap_or(0);
        counter += 1;
        env.storage().instance().set(&DataKey::ReqCounter, &counter);

        let now = env.ledger().timestamp();
        let expires_at = timeout_seconds.map(|s| now + s);
        
        if let Some(expiry) = expires_at {
            require_future_timestamp(expiry, now, "expires_at");
        }

        let request = MultisigBridgeRequest {
            request_id: counter,
            token_id,
            source_chain: 1,
            destination_chain,
            sender: caller.clone(),
            recipient,
            required_signatures,
            signatures: Vec::new(&env),
            created_at: now,
            expires_at,
            status: BridgeOperationStatus::Pending,
            metadata,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Request(counter), &request);

        env.events().publish(
            (symbol_short!("bridge"), symbol_short!("created")),
            (counter, token_id, caller),
        );

        counter
    }

    pub fn sign_bridge_request(env: Env, operator: Address, request_id: u64, approve: bool) {
        operator.require_auth();
        require_non_zero_address(&operator);
        require_non_zero_u64(request_id, "request_id");
        require_operator(&env, &operator);
        require_not_paused(&env);

        let mut request: MultisigBridgeRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Request(request_id))
            .expect("Request not found");

        if let Some(expires_at) = request.expires_at {
            if env.ledger().timestamp() > expires_at {
                panic!("Request expired");
            }
        }

        if request.signatures.contains(operator.clone()) {
            panic!("Already signed");
        }

        request.signatures.push_back(operator.clone());

        if !approve {
            request.status = BridgeOperationStatus::Failed;
        } else if request.signatures.len() >= request.required_signatures {
            request.status = BridgeOperationStatus::Locked;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Request(request_id), &request);
        
        env.events().publish(
            (symbol_short!("bridge"), symbol_short!("signed")),
            (request_id, operator, approve),
        );
    }

    pub fn execute_bridge(env: Env, operator: Address, request_id: u64) {
        operator.require_auth();
        require_non_zero_address(&operator);
        require_non_zero_u64(request_id, "request_id");
        require_operator(&env, &operator);
        require_not_paused(&env);

        let mut request: MultisigBridgeRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Request(request_id))
            .expect("Request not found");

        if request.status != BridgeOperationStatus::Locked {
            panic!("Request not ready");
        }

        let tx_hash = env
            .crypto()
            .sha256(&Bytes::from_slice(&env, &request_id.to_be_bytes()));

        let mut tx_counter: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TxCounter)
            .unwrap_or(0);
        tx_counter += 1;
        env.storage().instance().set(&DataKey::TxCounter, &tx_counter);

        let sender = request.sender.clone();

        let transaction = BridgeTransaction {
            transaction_id: tx_counter,
            token_id: request.token_id,
            source_chain: request.source_chain,
            destination_chain: request.destination_chain,
            sender: sender.clone(),
            recipient: request.recipient.clone(),
            transaction_hash: tx_hash.clone(),
            timestamp: env.ledger().timestamp(),
            gas_used: 0,
            status: BridgeOperationStatus::InTransit,
            metadata: request.metadata.clone(),
        };

        request.status = BridgeOperationStatus::Completed;
        env.storage()
            .persistent()
            .set(&DataKey::Request(request_id), &request);
        env.storage()
            .persistent()
            .set(&DataKey::VerifiedTx(tx_hash.clone()), &true);

        let mut history: Vec<BridgeTransaction> = env
            .storage()
            .persistent()
            .get(&DataKey::History(sender.clone()))
            .unwrap_or(Vec::new(&env));

        if history.len() >= MAX_HISTORY_ITEMS {
            history.remove(0);
        }
        history.push_back(transaction);
        env.storage()
            .persistent()
            .set(&DataKey::History(sender), &history);

        env.events().publish(
            (symbol_short!("bridge"), symbol_short!("executed")),
            (request_id, tx_hash),
        );
    }

    pub fn recover_failed_bridge(
        env: Env,
        admin: Address,
        request_id: u64,
        recovery_action: RecoveryAction,
    ) {
        admin.require_auth();
        require_non_zero_address(&admin);
        require_non_zero_u64(request_id, "request_id");
        require_admin(&env, &admin);
        require_not_paused(&env);

        let mut request: MultisigBridgeRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Request(request_id))
            .expect("Request not found");

        if !matches!(
            request.status,
            BridgeOperationStatus::Failed | BridgeOperationStatus::Expired
        ) {
            panic!("Request not in failed state");
        }

        match recovery_action {
            RecoveryAction::RetryBridge => {
                request.status = BridgeOperationStatus::Pending;
                request.signatures = Vec::new(&env);
            }
            RecoveryAction::CancelBridge
            | RecoveryAction::UnlockToken
            | RecoveryAction::RefundGas => {
                request.status = BridgeOperationStatus::Failed;
            }
        }

        env.storage()
            .persistent()
            .set(&DataKey::Request(request_id), &request);
        
        env.events().publish(
            (symbol_short!("bridge"), symbol_short!("recover")),
            request_id,
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

    pub fn set_role(env: Env, addr: Address, role: AccessControlRole) {
        access_control::set_role(&env, &env.current_contract_address(), &addr, role);
    }

    pub fn add_operator(env: Env, admin: Address, operator: Address) {
        admin.require_auth();
        require_non_zero_address(&admin);
        require_non_zero_address(&operator);
        require_admin(&env, &admin);

        let mut operators: Vec<Address> =
            env.storage().instance().get(&DataKey::Operators)
                .unwrap_or_else(|| panic!("Contract not initialized"));
        
        if operators.len() >= MAX_OPERATORS {
            panic!("Too many operators");
        }

        if !operators.contains(operator.clone()) {
            operators.push_back(operator.clone());
            env.storage().instance().set(&DataKey::Operators, &operators);
            
            env.events().publish(
                (symbol_short!("bridge"), symbol_short!("opadd")),
                operator,
            );
        }
    }

    pub fn remove_operator(env: Env, admin: Address, operator: Address) {
        admin.require_auth();
        require_non_zero_address(&admin);
        require_non_zero_address(&operator);
        require_admin(&env, &admin);

        let operators: Vec<Address> =
            env.storage().instance().get(&DataKey::Operators)
                .unwrap_or_else(|| panic!("Contract not initialized"));
        
        let config: BridgeConfig = env.storage().instance().get(&DataKey::Config)
            .unwrap_or_else(|| panic!("Contract not initialized"));

        if operators.len() <= config.min_signatures_required {
            panic!("Cannot remove operator: minimum signature requirement would not be met");
        }

        let mut new_operators = Vec::new(&env);
        for op in operators.iter() {
            if op != operator {
                new_operators.push_back(op);
            }
        }
        env.storage().instance().set(&DataKey::Operators, &new_operators);
        
        env.events().publish(
            (symbol_short!("bridge"), symbol_short!("oprm")),
            operator,
        );
    }
}

#[contractimpl]
impl PropertyBridge {
    pub fn version(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Version)
            .unwrap_or(CONTRACT_VERSION)
    }

    pub fn get_state_root(env: Env) -> soroban_sdk::BytesN<32> {
        get_state_root(&env)
    }

    pub fn get_config(env: Env) -> BridgeConfig {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Contract not initialized")
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Contract not initialized")
    }

    pub fn get_request(env: Env, request_id: u64) -> Option<MultisigBridgeRequest> {
        env.storage().persistent().get(&DataKey::Request(request_id))
    }

    pub fn get_history(env: Env, address: Address) -> Vec<BridgeTransaction> {
        env.storage()
            .persistent()
            .get(&DataKey::History(address))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_chain_info(env: Env, chain_id: u32) -> Option<ChainBridgeInfo> {
        env.storage().persistent().get(&DataKey::ChainInfo(chain_id))
    }

    pub fn is_operator(env: Env, address: Address) -> bool {
        let operators: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Operators)
            .unwrap_or(Vec::new(&env));
        operators.contains(address)
    }

    pub fn is_paused(env: Env) -> bool {
        circuit_breaker::is_paused(&env)
    }

    pub fn get_nonce(env: Env, address: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::Nonce(address))
            .unwrap_or(0)
    }
}
