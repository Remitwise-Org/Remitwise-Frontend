//! Pure, dependency-free helpers for validating zero-knowledge proof payloads.
//!
//! These helpers mirror the pre-deserialization sanity checks performed by the
//! on-chain Groth16 verifiers (see `contracts/zk-compliance`). They are used by
//! the fuzz/security test suites to exercise malformed-proof handling without
//! depending on arkworks.
//!
//! > **Security note:** cryptographic soundness comes from the Groth16 pairing
//! > checks executed on-chain. These helpers are a *gate* (reject obviously
//! > malformed input early), not a substitute for the proof verification itself.
//!
//! Mirrored copies of the canonicality check and the mod-*r* reduction live in
//! `contracts/zk-compliance/src/verification_keys.rs` and inline in the oracle
//! contract (those crates cannot depend on this library without pulling in
//! unrelated dependencies). Keep them in sync.

/// Compressed Groth16 proof length for Bn254 (A ∈ G1 + B ∈ G2 + C ∈ G1).
pub const GROTH16_BN254_PROOF_LEN: usize = 128;

/// Upper bound on a serialized proof payload accepted by the on-chain verifier.
pub const MAX_PROOF_LEN: usize = 1024;

/// Minimum plausible proof payload length (rejects empty/trivial inputs).
pub const MIN_PROOF_LEN: usize = 32;

/// Maximum number of public inputs accepted for a Bn254 Groth16 proof.
pub const MAX_PUBLIC_INPUTS: usize = 64;

/// Bn254 scalar field order
/// (21888242871839275222246405745257275088548364400416034343698204186575808495617)
/// expressed as little-endian u64 limbs.
///
/// hex: 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
const BN254_MODULUS_LIMBS_LE: [u64; 4] = [
    0x3c20_8c16_d87c_fd47,
    0x9781_6a91_6871_ca8d,
    0xb850_45b6_8181_585d,
    0x3064_4e72_e131_a029,
];

/// Returns `true` when the 32 little-endian bytes encode a canonical Bn254
/// scalar field element, i.e. the value is strictly less than the group order.
///
/// Non-canonical encodings (values ≥ modulus) are rejected by the on-chain
/// verifiers to prevent input malleability.
pub fn is_canonical_field_element(bytes: &[u8; 32]) -> bool {
    let limbs = limbs_from_bytes_le(bytes);
    // Compare from the most significant limb down.
    for i in (0..4).rev() {
        if limbs[i] < BN254_MODULUS_LIMBS_LE[i] {
            return true;
        }
        if limbs[i] > BN254_MODULUS_LIMBS_LE[i] {
            return false;
        }
    }
    // Exactly equal to the modulus -> not canonical.
    false
}

/// Reduce a 32-byte little-endian value modulo the Bn254 scalar field order,
/// returning the canonical 32-byte little-endian representation.
///
/// Matches the off-chain prover's public-input derivation exactly:
/// `ark_ff::PrimeField::from_le_bytes_mod_order` followed by canonical
/// (compressed) serialization. Every on-chain path that compares or gates
/// public inputs must apply this reduction: a uniform 32-byte hash exceeds the
/// field order with probability ≈ 81%, so the raw bytes rarely equal the
/// reduced public input.
pub fn reduce_mod_bn254(bytes: &[u8; 32]) -> [u8; 32] {
    let mut h = limbs_from_bytes_le(bytes);
    // H < 2^256 and the modulus is > 2^253, so this subtracts at most a
    // handful of times.
    loop {
        if !limbs_ge(&h, &BN254_MODULUS_LIMBS_LE) {
            break;
        }
        h = limbs_sub(&h, &BN254_MODULUS_LIMBS_LE);
    }
    limbs_to_bytes_le(&h)
}

/// Interpret 32 little-endian bytes as four little-endian u64 limbs.
fn limbs_from_bytes_le(bytes: &[u8; 32]) -> [u64; 4] {
    let mut limbs = [0u64; 4];
    for (i, limb) in limbs.iter_mut().enumerate() {
        let mut acc = 0u64;
        for j in 0..8 {
            acc |= (bytes[i * 8 + j] as u64) << (8 * j);
        }
        *limb = acc;
    }
    limbs
}

/// Serialize four little-endian u64 limbs back into 32 little-endian bytes.
fn limbs_to_bytes_le(limbs: &[u64; 4]) -> [u8; 32] {
    let mut out = [0u8; 32];
    for (i, limb) in limbs.iter().enumerate() {
        for j in 0..8 {
            out[i * 8 + j] = ((limb >> (8 * j)) & 0xff) as u8;
        }
    }
    out
}

/// Compare two 256-bit little-endian limb arrays: `a >= b`.
fn limbs_ge(a: &[u64; 4], b: &[u64; 4]) -> bool {
    for i in (0..4).rev() {
        if a[i] > b[i] {
            return true;
        }
        if a[i] < b[i] {
            return false;
        }
    }
    true // equal
}

/// Subtract two 256-bit little-endian limb arrays (requires `a >= b`).
fn limbs_sub(a: &[u64; 4], b: &[u64; 4]) -> [u64; 4] {
    let mut out = [0u64; 4];
    let mut borrow = false;
    for i in 0..4 {
        let (d1, b1) = a[i].overflowing_sub(b[i]);
        let (d2, b2) = d1.overflowing_sub(borrow as u64);
        out[i] = d2;
        borrow = b1 || b2;
    }
    out
}

/// Returns `true` when the serialized proof payload is inside the accepted
/// length window. Actual structural validation is performed by arkworks during
/// deserialization on-chain.
pub fn validate_proof_payload(payload: &[u8]) -> bool {
    !payload.is_empty() && payload.len() >= MIN_PROOF_LEN && payload.len() <= MAX_PROOF_LEN
}

/// Returns `true` when the public-input set is well-formed: non-empty, bounded
/// in size, and every element is a canonical Bn254 scalar field element.
pub fn validate_public_inputs(inputs: &[[u8; 32]]) -> bool {
    !inputs.is_empty()
        && inputs.len() <= MAX_PUBLIC_INPUTS
        && inputs.iter().all(|input| is_canonical_field_element(input))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn payload_length_window() {
        assert!(!validate_proof_payload(&[]));
        assert!(!validate_proof_payload(&[0u8; 31]));
        assert!(validate_proof_payload(&[0u8; GROTH16_BN254_PROOF_LEN]));
        assert!(validate_proof_payload(&[0u8; 512]));
        assert!(!validate_proof_payload(&[0u8; MAX_PROOF_LEN + 1]));
    }

    #[test]
    fn canonical_field_element_boundaries() {
        assert!(is_canonical_field_element(&[0u8; 32]));

        // All-ones is far above the modulus -> non-canonical.
        assert!(!is_canonical_field_element(&[0xffu8; 32]));

        // modulus - 1 (limb0 decremented) is the largest canonical value.
        let mut m_minus_one = [0u8; 32];
        let limbs = [
            0x3c20_8c16_d87c_fd46u64,
            0x9781_6a91_6871_ca8du64,
            0xb850_45b6_8181_585du64,
            0x3064_4e72_e131_a029u64,
        ];
        for (i, limb) in limbs.iter().enumerate() {
            for j in 0..8 {
                m_minus_one[i * 8 + j] = ((limb >> (8 * j)) & 0xff) as u8;
            }
        }
        assert!(is_canonical_field_element(&m_minus_one));

        // Exactly the modulus -> not canonical.
        let mut modulus = m_minus_one;
        modulus[0] = modulus[0].wrapping_add(1);
        assert!(!is_canonical_field_element(&modulus));
    }

    #[test]
    fn public_inputs_validation() {
        assert!(!validate_public_inputs(&[]));
        assert!(validate_public_inputs(&[[0u8; 32]]));
        assert!(!validate_public_inputs(&[[0xffu8; 32]]));
        // Array literals are used instead of `vec!` because this is a `#![no_std]`
        // crate and the `vec!` macro is not in the prelude.
        let many = [[0u8; 32]; MAX_PUBLIC_INPUTS];
        assert!(validate_public_inputs(&many));
        let too_many = [[0u8; 32]; MAX_PUBLIC_INPUTS + 1];
        assert!(!validate_public_inputs(&too_many));
    }

    #[test]
    fn reduce_mod_bn254_properties() {
        // Zero and a canonical one are unchanged.
        assert_eq!(reduce_mod_bn254(&[0u8; 32]), [0u8; 32]);
        let mut one = [0u8; 32];
        one[0] = 1;
        assert_eq!(reduce_mod_bn254(&one), one);

        // The modulus itself reduces to zero.
        let mut modulus = [0u8; 32];
        for (i, limb) in BN254_MODULUS_LIMBS_LE.iter().enumerate() {
            for j in 0..8 {
                modulus[i * 8 + j] = ((limb >> (8 * j)) & 0xff) as u8;
            }
        }
        assert_eq!(reduce_mod_bn254(&modulus), [0u8; 32]);

        // modulus + 1 reduces to one.
        let mut m_plus_one = modulus;
        m_plus_one[0] = m_plus_one[0].wrapping_add(1);
        assert_eq!(reduce_mod_bn254(&m_plus_one), one);

        // Any input reduces to a canonical field element, and reduction is
        // idempotent (a raw binding hash exceeds the modulus ~81% of the
        // time, so this path is the common one).
        let all_ones = [0xffu8; 32];
        let reduced = reduce_mod_bn254(&all_ones);
        assert!(is_canonical_field_element(&reduced));
        assert_eq!(reduce_mod_bn254(&reduced), reduced);
    }
}
