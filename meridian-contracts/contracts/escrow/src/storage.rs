// All keys and value types stored by this contract use `#[contracttype]` for
// Soroban-native XDR serialization.  Never store a type that lacks this
// attribute — doing so causes silent decoding failures across contract
// versions (#358).
use soroban_sdk::{contracttype, Address};

use crate::types::ApprovalType;

#[contracttype]
pub enum DataKey {
    Escrow(u64),
    EscrowCount,
    Admin,
    Version,
    MultiSig(u64),
    Signature(u64, ApprovalType, Address),
    SigCount(u64, ApprovalType),
    Nonce(Address),
    FeeBps,
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
