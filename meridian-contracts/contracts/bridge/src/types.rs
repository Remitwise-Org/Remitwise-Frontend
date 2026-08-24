use soroban_sdk::{contracttype, Address, BytesN, String, Vec};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[contracttype]
pub enum BridgeOperationStatus {
    Pending,
    Locked,
    Completed,
    Failed,
    Expired,
    InTransit,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct PropertyMetadata {
    pub location: String,
    pub size: u64,
    pub legal_description: String,
    pub valuation: u128,
    pub documents_url: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct BridgeConfig {
    pub supported_chains: Vec<u32>,
    pub min_signatures_required: u32,
    pub max_signatures_required: u32,
    pub default_timeout_seconds: u64,
    pub gas_limit_per_bridge: u64,
    pub metadata_preservation: bool,
    pub service_fee: i128,
    pub fee_token: Address,
    pub fee_recipient: Address,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct MultisigBridgeRequest {
    pub request_id: u64,
    pub token_id: u64,
    pub source_chain: u32,
    pub destination_chain: u32,
    pub sender: Address,
    pub recipient: Address,
    pub required_signatures: u32,
    pub signatures: Vec<Address>,
    pub created_at: u64,
    pub expires_at: Option<u64>,
    pub status: BridgeOperationStatus,
    pub metadata: PropertyMetadata,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct BridgeTransaction {
    pub transaction_id: u64,
    pub token_id: u64,
    pub source_chain: u32,
    pub destination_chain: u32,
    pub sender: Address,
    pub recipient: Address,
    pub transaction_hash: BytesN<32>,
    pub timestamp: u64,
    pub gas_used: u64,
    pub status: BridgeOperationStatus,
    pub metadata: PropertyMetadata,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct ChainBridgeInfo {
    pub chain_id: u32,
    pub chain_name: String,
    pub bridge_contract_address: Option<String>,
    pub is_active: bool,
    pub gas_multiplier: u32,
    pub confirmation_blocks: u32,
    pub supported_tokens: Vec<u64>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[contracttype]
pub enum RecoveryAction {
    UnlockToken,
    RefundGas,
    RetryBridge,
    CancelBridge,
}
