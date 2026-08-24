/// Namespaced storage keys to prevent collisions across contract storage entries.
#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum StorageKey {
    /// Stores the contract owner/admin address.
    Admin,
    /// Maps a policy ID to its Policy struct.
    Policy(u64),
    /// Maps a claim ID to its Claim struct.
    Claim(u64),
    /// Maps a pool ID to its RiskPool struct.
    Pool(u64),
    /// Tracks the running counter for policy IDs.
    PolicyCounter,
    /// Tracks the running counter for claim IDs.
    ClaimCounter,
    /// Tracks the running counter for pool IDs.
    PoolCounter,
    /// Maps an account to their list of policy IDs.
    AccountPolicies(ink::primitives::AccountId),
    /// Stores the paused state of the contract.
    Paused,
    /// Maps a nonce to its used state for replay protection.
    NonceUsed(u64),
}
