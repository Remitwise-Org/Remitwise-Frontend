// All keys and value types stored by this contract use `#[contracttype]` for
// Soroban-native XDR serialization.  Never store a type that lacks this
// attribute — doing so causes silent decoding failures across contract
// versions (#358).
use soroban_sdk::{contracttype, Address, BytesN};

#[contracttype]
pub enum DataKey {
    Config,
    Admin,
    Version,
    Request(u64),
    History(Address),
    ChainInfo(u32),
    VerifiedTx(BytesN<32>),
    Operators,
    ReqCounter,
    TxCounter,
    Nonce(Address),
}

/// Maximum bridge history entries retained per account (prevents unbounded growth).
pub const MAX_HISTORY_ITEMS: u32 = 50;
