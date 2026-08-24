//! Canonical event emission for every Stellar Insured contract.
//!
//! Historically each contract emitted ad-hoc events with inconsistent topic and
//! payload shapes, which made off-chain indexing, the backend `EventsService`,
//! and the Merkle proof pipeline fragile. This module centralizes emission
//! behind a single [`EventSchema`] and the [`emit_event`]/[`emit_event_with`]
//! helpers so that every event — regardless of source contract — shares one
//! shape that indexers can parse uniformly.
//!
//! In addition to publishing the event, [`emit_event`] folds the event hash
//! into an on-chain accumulator (a hash chain) exposed via
//! [`event_indexer::get_events_root`]. That 32-byte root is a single
//! commitment over every emitted event, enabling Merkle-style inclusion proofs.

use crate::state_root::{compute_root, get_state_root, set_state_root};
use soroban_sdk::xdr::ToXdr;
use soroban_sdk::{contracttype, Bytes, BytesN, Env, Symbol};

pub mod event_indexer;
pub use event_indexer::{get_events_root, hash_event, record_event};

/// Current version of the canonical event schema. Bump whenever the schema
/// shape changes so indexers can branch on compatibility.
pub const EVENT_SCHEMA_VERSION: u32 = 2;

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ValidationFailedEvent {
    pub code: u32,
    pub field: Symbol,
}

pub fn emit_validation_failed(env: &Env, error: crate::ValidationError, field: Symbol) {
    emit_event_with(
        env,
        Symbol::new(env, "VALIDATION"),
        Symbol::new(env, "ValidationFailed"),
        &ValidationFailedEvent {
            code: error as u32,
            field,
        },
    );
}

/// Canonical, chain-agnostic event schema emitted by every contract.
///
/// `contract` + `action` are the Soroban event topics; the remaining fields
/// form the data payload. `payload` is the XDR encoding of the event-specific
/// structured data (use [`emit_event_with`] to build it automatically).
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EventSchema {
    /// Identifying name of the emitting contract (e.g. `POLICY`, `CLAIMS`).
    pub contract: Symbol,
    /// The state transition that occurred (e.g. `CREATE`, `APPROVE`).
    pub action: Symbol,
    /// Ledger/block sequence at emission time.
    pub block_number: u32,
    /// Hash of the transaction that emitted the event.
    pub tx_hash: BytesN<32>,
    /// Canonical (XDR) encoding of the event-specific structured data.
    pub payload: Bytes,
    /// Schema version for forward/backward compatibility.
    pub version: u32,
    /// State commitment after this transition.
    pub state_root: BytesN<32>,
}

/// Emit a canonical, indexed event from a pre-built payload.
///
/// Publishes `(contract, action)` topics with the full [`EventSchema`] as data,
/// then folds the event hash into the on-chain events accumulator.
pub fn emit_event(env: &Env, contract: Symbol, action: Symbol, payload: Bytes) -> EventSchema {
    let mut root_entries = soroban_sdk::Vec::new(env);
    root_entries.push_back(get_state_root(env));
    root_entries.push_back(payload.clone());
    let next_root = compute_root(env, root_entries);
    set_state_root(env, &next_root);

    let schema = EventSchema {
        contract: contract.clone(),
        action: action.clone(),
        block_number: env.ledger().sequence(),
        // NOTE: soroban-sdk 20.0.0 does not expose `env.ledger().transaction_hash()`.
        // Once the SDK is upgraded to >=21 this should be wired to
        // `env.ledger().transaction_hash()` so each event carries its real tx hash.
        tx_hash: BytesN::from_array(env, &[0u8; 32]),
        payload,
        version: EVENT_SCHEMA_VERSION,
        state_root: next_root,
    };
    env.events().publish(
        (schema.contract.clone(), schema.action.clone()),
        schema.clone(),
    );
    record_event(env, &schema);
    schema
}

/// Emit a canonical, indexed event, encoding `data` into the payload.
///
/// `data` must implement [`ToXdr`] (all `#[contracttype]` structs do). This is
/// the ergonomic entrypoint most contracts should use, e.g.
/// `emit_event_with(env, symbol_short!("CLAIMS"), symbol_short!("APPROVED"), &claim)`.
pub fn emit_event_with<T: ToXdr + Clone>(
    env: &Env,
    contract: Symbol,
    action: Symbol,
    data: &T,
) -> EventSchema {
    emit_event(env, contract, action, data.clone().to_xdr(env))
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        contract, contractimpl, symbol_short, testutils::Address as _, Address, Bytes, BytesN, Env,
    };

    // Minimal contract so storage/event operations run inside a real contract
    // context (required by the Soroban host for instance storage and events).
    #[contract]
    struct EventTestContract;

    #[contractimpl]
    impl EventTestContract {
        pub fn ping(_env: Env) {}
    }

    fn test_env() -> (Env, Address) {
        let env = Env::default();
        let addr = env.register_contract(None, EventTestContract);
        (env, addr)
    }

    #[test]
    fn emits_canonical_schema() {
        let (env, contract) = test_env();
        let payload = Bytes::new(&env);
        let schema = env.as_contract(&contract, || {
            emit_event(
                &env,
                symbol_short!("POLICY"),
                symbol_short!("CREATE"),
                payload.clone(),
            )
        });
        assert_eq!(schema.contract, symbol_short!("POLICY"));
        assert_eq!(schema.action, symbol_short!("CREATE"));
        assert_eq!(schema.version, EVENT_SCHEMA_VERSION);
        assert_eq!(schema.payload, payload);
        assert_eq!(schema.block_number, env.ledger().sequence());
        // SDK 20.0.0 has no transaction_hash(); placeholder is all-zero.
        assert_eq!(schema.tx_hash, BytesN::from_array(&env, &[0u8; 32]));
    }

    #[test]
    fn event_indexer_root_advances_and_is_deterministic() {
        let (env, contract) = test_env();
        let zero = BytesN::from_array(&env, &[0u8; 32]);
        let (root1, root2, s2) = env.as_contract(&contract, || {
            assert_eq!(get_events_root(&env), zero);
            emit_event(
                &env,
                symbol_short!("CLAIMS"),
                symbol_short!("SUBMITTED"),
                Bytes::new(&env),
            );
            let root1 = get_events_root(&env);
            assert_ne!(root1, zero);
            let s2 = emit_event(
                &env,
                symbol_short!("CLAIMS"),
                symbol_short!("APPROVED"),
                Bytes::new(&env),
            );
            let root2 = get_events_root(&env);
            assert_ne!(root2, root1);
            (root1, root2, s2)
        });

        // The accumulator is a pure hash chain: root2 == H(root1 || H(s2)).
        // Verified within a single env (cross-env BytesN comparison is panics
        // in Soroban, by design).
        let h2 = hash_event(&env, &s2);
        let mut buf = Bytes::new(&env);
        buf.extend_from_array(&root1.to_array());
        buf.extend_from_array(&h2.to_array());
        assert_eq!(root2, env.crypto().sha256(&buf));
    }

    #[test]
    fn hash_event_is_stable() {
        let (env, _contract) = test_env();
        let schema = EventSchema {
            contract: symbol_short!("C"),
            action: symbol_short!("A"),
            block_number: 7,
            tx_hash: BytesN::from_array(&env, &[0u8; 32]),
            payload: Bytes::new(&env),
            version: 1,
            state_root: get_state_root(&env),
        };
        assert_eq!(hash_event(&env, &schema), hash_event(&env, &schema));
    }
}
