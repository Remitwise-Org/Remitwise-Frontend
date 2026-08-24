//! Deterministic state-root hashing shared by Soroban contracts.

use soroban_sdk::{contracttype, Bytes, BytesN, Env, Symbol, Vec};

const STATE_ROOT_KEY: &str = "STATEROOT";

/// Small, deterministic hasher compatible with the backend's FNV-style hash.
pub struct MerkleHasher;

impl MerkleHasher {
    pub fn hash(env: &Env, value: &Bytes) -> BytesN<32> {
        let mut state = 0x811c9dc5u32;
        for byte in value.iter() {
            state ^= byte as u32;
            state = state.wrapping_mul(0x01000193);
        }

        let word = state.to_be_bytes();
        let mut digest = [0u8; 32];
        for chunk in digest.chunks_exact_mut(4) {
            chunk.copy_from_slice(&word);
        }
        BytesN::from_array(env, &digest)
    }
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StateRoot {
    pub root: BytesN<32>,
}

/// Compute a binary Merkle root, duplicating the final node at odd levels.
pub fn compute_root(env: &Env, entries: Vec<Bytes>) -> BytesN<32> {
    if entries.is_empty() {
        return BytesN::from_array(env, &[0u8; 32]);
    }

    let mut level = Vec::new(env);
    for entry in entries.iter() {
        level.push_back(MerkleHasher::hash(env, &entry));
    }

    while level.len() > 1 {
        let mut next = Vec::new(env);
        let mut index = 0u32;
        while index < level.len() {
            let left = level.get(index).unwrap();
            let right = level.get(index + 1).unwrap_or(left.clone());
            let mut input = Bytes::new(env);
            input.extend_from_array(&left.to_array());
            input.extend_from_array(&right.to_array());
            next.push_back(MerkleHasher::hash(env, &input));
            index += 2;
        }
        level = next;
    }

    level.get(0).unwrap()
}

pub fn get_state_root(env: &Env) -> BytesN<32> {
    env.storage()
        .instance()
        .get(&Symbol::new(env, STATE_ROOT_KEY))
        .unwrap_or_else(|| BytesN::from_array(env, &[0u8; 32]))
}

pub fn set_state_root(env: &Env, root: &BytesN<32>) {
    env.storage()
        .instance()
        .set(&Symbol::new(env, STATE_ROOT_KEY), root);
}
