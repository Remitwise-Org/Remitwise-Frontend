//! Adversarial tests for zero-knowledge proof handling.
//!
//! These tests model the input-validation rules implemented by the on-chain
//! Groth16 verifiers (see `contracts/zk-compliance/src/verification_keys.rs` and
//! the mirrored shared helpers in `contracts/lib/src/zk.rs`):
//!
//! * proof payloads must fall inside an accepted length window;
//! * public inputs must be non-empty, bounded in count, and every element must
//!   be a canonical Bn254 scalar field element (strictly `< modulus`);
//! * the actual Groth16 pairing checks (which provide cryptographic soundness)
//!   run inside the contracts via arkworks — these tests exercise the *gate*
//!   that rejects obviously malformed input before deserialization.
//!
//! The validator here is a self-contained model of those rules so the suite
//! stays dependency-free; keep it in sync with the two mirrored
//! implementations above.

use proptest::prelude::*;

/// Compressed Groth16 proof length for Bn254.
const GROTH16_BN254_PROOF_LEN: usize = 128;

/// Accepted proof payload length window (mirrors the on-chain gate).
const MAX_PROOF_LEN: usize = 1024;
const MIN_PROOF_LEN: usize = 32;

/// Maximum number of public inputs.
const MAX_PUBLIC_INPUTS: usize = 64;

/// Bn254 scalar field order as little-endian u64 limbs.
const BN254_MODULUS_LIMBS_LE: [u64; 4] = [
    0x3c20_8c16_d87c_fd47,
    0x9781_6a91_6871_ca8d,
    0xb850_45b6_8181_585d,
    0x3064_4e72_e131_a029,
];

/// Model of the on-chain payload-length gate.
fn model_validate_proof_payload(payload: &[u8]) -> bool {
    !payload.is_empty()
        && payload.len() >= MIN_PROOF_LEN
        && payload.len() <= MAX_PROOF_LEN
}

/// Model of the on-chain canonical-field-element check.
fn model_is_canonical_field_element(bytes: &[u8; 32]) -> bool {
    let mut limbs = [0u64; 4];
    for (i, limb) in limbs.iter_mut().enumerate() {
        let mut acc = 0u64;
        for j in 0..8 {
            acc |= (bytes[i * 8 + j] as u64) << (8 * j);
        }
        *limb = acc;
    }
    for i in (0..4).rev() {
        if limbs[i] < BN254_MODULUS_LIMBS_LE[i] {
            return true;
        }
        if limbs[i] > BN254_MODULUS_LIMBS_LE[i] {
            return false;
        }
    }
    false
}

/// Model of the on-chain public-inputs gate.
fn model_validate_public_inputs(inputs: &[[u8; 32]]) -> bool {
    !inputs.is_empty()
        && inputs.len() <= MAX_PUBLIC_INPUTS
        && inputs.iter().all(model_is_canonical_field_element)
}

/// Strategy for arbitrary (potentially malicious) 32-byte field encodings.
fn fuzz_field_bytes() -> impl Strategy<Value = [u8; 32]> {
    prop::array::array32(any::<u8>())
}

/// Strategy for arbitrary proof payload lengths.
fn fuzz_payload() -> impl Strategy<Value = Vec<u8>> {
    prop::collection::vec(any::<u8>(), 0..2048)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    /// Malformed proof payloads must never panic the gate, and obviously
    /// invalid sizes must be rejected.
    #[test]
    fn fuzz_malformed_proof_payloads(payload in fuzz_payload()) {
        let accepted = model_validate_proof_payload(&payload);
        if payload.is_empty() || payload.len() < MIN_PROOF_LEN || payload.len() > MAX_PROOF_LEN {
            prop_assert!(!accepted, "out-of-window payload must be rejected");
        }
        // The canonical compressed proof length is always accepted.
        let canonical = vec![0u8; GROTH16_BN254_PROOF_LEN];
        prop_assert!(model_validate_proof_payload(&canonical));
    }

    /// Arbitrary field encodings must not panic the canonicality check.
    #[test]
    fn fuzz_field_element_canonicality(bytes in fuzz_field_bytes()) {
        let canonical = model_is_canonical_field_element(&bytes);
        prop_assert!(canonical == model_is_canonical_field_element(&bytes));
        // Values that reduce mod p (i.e. >= modulus) are rejected as malleable.
        let all_ones = [0xffu8; 32];
        prop_assert!(!model_is_canonical_field_element(&all_ones));
    }

    /// Public-input arrays with too many elements must be rejected.
    #[test]
    fn fuzz_public_input_count(count in 0usize..MAX_PUBLIC_INPUTS + 10) {
        let inputs = vec![[0u8; 32]; count];
        let accepted = model_validate_public_inputs(&inputs);
        prop_assert_eq!(accepted, count > 0 && count <= MAX_PUBLIC_INPUTS);
    }
}

// ---------------------------------------------------------------------------
// Deterministic adversarial cases
// ---------------------------------------------------------------------------

/// A `verify`-shaped pipeline: payload + inputs must pass the gate before the
/// cryptographic check is even attempted. All of these must be rejected.
#[test]
fn adversarial_proofs_are_rejected() {
    // Empty / truncated payloads.
    assert!(!model_validate_proof_payload(&[]));
    assert!(!model_validate_proof_payload(&[0u8; GROTH16_BN254_PROOF_LEN - 1]));
    assert!(!model_validate_proof_payload(&[0u8; MAX_PROOF_LEN + 1]));

    // Zero-length proof with a valid-looking input.
    let inputs = vec![[0u8; 32]];
    assert!(model_validate_public_inputs(&inputs));
    assert!(!model_validate_proof_payload(&[]));

    // Non-canonical public input (>= modulus) must be rejected.
    assert!(!model_validate_public_inputs(&[[0xffu8; 32]]));

    // Exactly the modulus is non-canonical.
    let mut modulus = [0u8; 32];
    for (i, limb) in [
        0x3c20_8c16_d87c_fd47u64,
        0x9781_6a91_6871_ca8du64,
        0xb850_45b6_8181_585du64,
        0x3064_4e72_e131_a029u64,
    ]
    .iter()
    .enumerate()
    {
        for j in 0..8 {
            modulus[i * 8 + j] = ((limb >> (8 * j)) & 0xff) as u8;
        }
    }
    assert!(!model_is_canonical_field_element(&modulus));

    // modulus - 1 is the largest canonical value.
    modulus[0] = modulus[0].wrapping_sub(1);
    assert!(model_is_canonical_field_element(&modulus));
}

/// Boundary values around the accepted length window.
#[test]
fn proof_payload_window_boundaries() {
    assert!(model_validate_proof_payload(&[0u8; MIN_PROOF_LEN]));
    assert!(model_validate_proof_payload(&[0u8; GROTH16_BN254_PROOF_LEN]));
    assert!(model_validate_proof_payload(&[0u8; MAX_PROOF_LEN]));
    assert!(!model_validate_proof_payload(&[0u8; MAX_PROOF_LEN + 1]));
}
