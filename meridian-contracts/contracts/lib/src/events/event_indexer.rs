//! On-chain event indexing for the canonical event schema.
//!
//! Every emitted [`EventSchema`](crate::events::EventSchema) is hashed and
//! folded into a running accumulator (a hash chain) stored in the contract's
//! instance storage. The resulting root is a single 32-byte commitment over the
//! entire event history of the contract, which off-chain indexers and the
//! Merkle proof pipeline can use to prove inclusion of any individual event.

use soroban_sdk::xdr::ToXdr;
use soroban_sdk::{Bytes, BytesN, Env, Symbol};

use super::EventSchema;

/// Instance-storage key under which the running events accumulator is kept.
const EVENTS_ROOT_KEY: &str = "EVTROOT";

/// Hash a canonical event schema for inclusion in the on-chain accumulator.
pub fn hash_event(env: &Env, schema: &EventSchema) -> BytesN<32> {
    env.crypto().sha256(&schema.clone().to_xdr(env))
}

/// Fold an event's hash into the running events accumulator (hash chain).
///
/// `root = H(prev_root || event_hash)`, starting from an all-zero root. Because
/// each step depends on the previous root, the final [`get_events_root`] value
/// commits to the ordered sequence of every event the contract has emitted.
pub fn record_event(env: &Env, schema: &EventSchema) {
    let key = Symbol::new(env, EVENTS_ROOT_KEY);
    let prev: BytesN<32> = env
        .storage()
        .instance()
        .get(&key)
        .unwrap_or_else(|| BytesN::from_array(env, &[0u8; 32]));
    let event_hash = hash_event(env, schema);
    let mut buf = Bytes::new(env);
    buf.extend_from_array(&prev.to_array());
    buf.extend_from_array(&event_hash.to_array());
    let root = env.crypto().sha256(&buf);
    env.storage().instance().set(&key, &root);
}

/// Current commitment over all emitted events (all-zero if none yet).
pub fn get_events_root(env: &Env) -> BytesN<32> {
    let key = Symbol::new(env, EVENTS_ROOT_KEY);
    env.storage()
        .instance()
        .get(&key)
        .unwrap_or_else(|| BytesN::from_array(env, &[0u8; 32]))
}
