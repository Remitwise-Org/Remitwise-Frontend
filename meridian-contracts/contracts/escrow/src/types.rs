use soroban_sdk::{contracttype, Address, Vec};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[contracttype]
pub enum EscrowStatus {
    Created,
    Funded,
    Active,
    Released,
    Refunded,
    Disputed,
    Cancelled,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[contracttype]
pub enum ApprovalType {
    Release,
    Refund,
    EmergencyOverride,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct EscrowData {
    pub id: u64,
    pub property_id: u64,
    pub buyer: Address,
    pub seller: Address,
    pub amount: i128,
    pub deposited_amount: i128,
    pub status: EscrowStatus,
    pub created_at: u64,
    pub release_time_lock: Option<u64>,
    pub participants: Vec<Address>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct MultiSigConfig {
    pub required_signatures: u32,
    pub signers: Vec<Address>,
}
