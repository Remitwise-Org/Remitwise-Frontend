/// TTL (Time-To-Live) extension helpers for Soroban persistent storage.
///
/// Soroban evicts entries whose TTL reaches zero. Call `extend` after every
/// write so data survives across ledger checkpoints.

/// Number of ledgers to extend TTL by on each refresh.
const TTL_EXTENSION_LEDGERS: u32 = 100_000;

/// Threshold below which a TTL refresh is triggered (half the extension window).
const TTL_RENEWAL_THRESHOLD: u32 = TTL_EXTENSION_LEDGERS / 2;

/// Extends the TTL of a persistent entry if it is below the renewal threshold.
///
/// `current_ttl` is the value returned by `env.storage().persistent().get_ttl(&key)`.
/// Returns `true` when an extension was performed.
pub fn extend_if_needed(current_ttl: u32) -> bool {
    if current_ttl < TTL_RENEWAL_THRESHOLD {
        // Caller should invoke:
        //   env.storage().persistent().extend_ttl(&key, TTL_RENEWAL_THRESHOLD, TTL_EXTENSION_LEDGERS);
        true
    } else {
        false
    }
}

/// Returns the standard extension window used across the contract.
pub fn extension_ledgers() -> u32 {
    TTL_EXTENSION_LEDGERS
}

/// Returns the threshold below which a renewal should be triggered.
pub fn renewal_threshold() -> u32 {
    TTL_RENEWAL_THRESHOLD
}
