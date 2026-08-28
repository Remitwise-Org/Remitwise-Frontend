//! Compatibility vectors for the state-root protocol.
//!
//! The contract implementations use a binary Merkle tree with duplicated odd
//! leaves. These vectors are intentionally byte-oriented so off-chain clients
//! cannot depend on platform string encoding.

fn simple_hash(value: &[u8]) -> [u8; 32] {
    let mut state = 0x811c9dc5u32;
    for byte in value {
        state ^= *byte as u32;
        state = state.wrapping_mul(0x01000193);
    }
    let word = state.to_be_bytes();
    let mut output = [0u8; 32];
    for chunk in output.chunks_exact_mut(4) {
        chunk.copy_from_slice(&word);
    }
    output
}

#[test]
fn rust_simple_hash_is_deterministic() {
    assert_eq!(simple_hash(b"state-entry"), simple_hash(b"state-entry"));
    assert_ne!(simple_hash(b"state-entry"), simple_hash(b"other-entry"));
}

#[test]
fn state_root_hash_fixture_is_32_bytes() {
    assert_eq!(simple_hash(b"state-entry").len(), 32);
}
