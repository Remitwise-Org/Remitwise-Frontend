//! Verification-key management for Groth16 proofs (Bn254).
//!
//! This module owns the wire-format conventions shared between the on-chain
//! verifiers and the off-chain prover tooling (`scripts/generate_zk_proofs`):
//!
//! * proofs and verification keys are serialized **compressed** via
//!   `ark_serialize` (`serialize_compressed` / `deserialize_compressed`);
//! * a compressed Groth16 proof over Bn254 is exactly
//!   [`GROTH16_BN254_PROOF_LEN`] bytes;
//! * public inputs are 32-byte little-endian Bn254 scalar field elements and
//!   must be canonical (strictly smaller than the group order).
//!
//! The pure validation helpers below are mirrored in
//! `contracts/lib/src/zk.rs` (used by the fuzz/security suites). Keep them in
//! sync.

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
const BN254_MODULUS_LIMBS_LE: [u64; 4] = [
    0x3c20_8c16_d87c_fd47,
    0x9781_6a91_6871_ca8d,
    0xb850_45b6_8181_585d,
    0x3064_4e72_e131_a029,
];

/// Returns `true` when the 32 little-endian bytes encode a canonical Bn254
/// scalar field element (strictly less than the group order).
pub fn is_canonical_field_element(bytes: &[u8; 32]) -> bool {
    let limbs = limbs_from_bytes_le(bytes);
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

/// Reduce a 32-byte little-endian value modulo the Bn254 scalar field order,
/// returning the canonical 32-byte little-endian representation.
///
/// Mirrors `contracts/lib/src/zk.rs::reduce_mod_bn254` (and the oracle
/// contract's inline copy). It matches the off-chain prover's public-input
/// derivation exactly: `ark_ff::PrimeField::from_le_bytes_mod_order` followed
/// by compressed serialization. A uniform 32-byte hash exceeds the field order
/// with probability ≈ 81%, so binding checks must reduce before comparing or
/// gating public inputs.
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

/// Returns `true` when the proof payload is inside the accepted length window.
pub fn validate_proof_payload(payload: &[u8]) -> bool {
    !payload.is_empty()
        && payload.len() >= MIN_PROOF_LEN
        && payload.len() <= MAX_PROOF_LEN
}

/// Returns `true` when the public-input set is non-empty, bounded, and every
/// element is a canonical Bn254 scalar field element.
pub fn validate_public_inputs(inputs: &[[u8; 32]]) -> bool {
    !inputs.is_empty()
        && inputs.len() <= MAX_PUBLIC_INPUTS
        && inputs.iter().all(|input| is_canonical_field_element(input))
}

// ---------------------------------------------------------------------------
// arkworks (de)serialization helpers — only compiled with the `zk` feature.
// ---------------------------------------------------------------------------

#[cfg(feature = "zk")]
use ark_bn254::Bn254;
#[cfg(feature = "zk")]
use ark_groth16::{Proof, VerifyingKey};
#[cfg(feature = "zk")]
use ark_serialize::CanonicalDeserialize;
// CanonicalSerialize is only consumed by the test-only serialize helpers.
#[cfg(feature = "zk")]
#[cfg(test)]
use ark_serialize::CanonicalSerialize;

/// Deserialize a compressed Groth16 verification key for Bn254.
#[cfg(feature = "zk")]
pub fn deserialize_vk(bytes: &[u8]) -> core::result::Result<VerifyingKey<Bn254>, ()> {
    VerifyingKey::<Bn254>::deserialize_compressed(bytes).map_err(|_| ())
}

/// Serialize a Groth16 verification key in compressed form (test helper — the
/// contract only needs the deserializer).
#[cfg(feature = "zk")]
#[cfg(test)]
pub fn serialize_vk(vk: &VerifyingKey<Bn254>) -> Vec<u8> {
    let mut out = Vec::new();
    vk.serialize_compressed(&mut out).expect("serializing a valid verification key cannot fail");
    out
}

/// Deserialize a compressed Groth16 proof for Bn254.
#[cfg(feature = "zk")]
pub fn deserialize_proof(bytes: &[u8]) -> core::result::Result<Proof<Bn254>, ()> {
    Proof::<Bn254>::deserialize_compressed(bytes).map_err(|_| ())
}

/// Serialize a Groth16 proof in compressed form (test helper).
#[cfg(feature = "zk")]
#[cfg(test)]
pub fn serialize_proof(proof: &Proof<Bn254>) -> Vec<u8> {
    let mut out = Vec::new();
    proof.serialize_compressed(&mut out).expect("serializing a valid proof cannot fail");
    out
}

#[cfg(feature = "zk")]
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vk_proof_roundtrip() {
        use ark_bn254::Fr;
        use ark_ff::{Field, UniformRand};
        use ark_groth16::{create_random_proof, generate_random_parameters_with_reduction};
        use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};
        use ark_std::test_rng;

        #[derive(Clone)]
        struct SqrtCircuit<F: Field> {
            public: Option<F>,
            secret: Option<F>,
        }

        impl<F: Field> ConstraintSynthesizer<F> for SqrtCircuit<F> {
            fn generate_constraints(
                self,
                cs: ConstraintSystemRef<F>,
            ) -> Result<(), SynthesisError> {
                let secret =
                    cs.new_witness_variable(|| self.secret.ok_or(SynthesisError::AssignmentMissing))?;
                let public =
                    cs.new_input_variable(|| self.public.ok_or(SynthesisError::AssignmentMissing))?;
                cs.enforce_constraint(
                    || "secret * secret == public",
                    |lc| lc + secret,
                    |lc| lc + secret,
                    |lc| lc + public,
                )?;
                Ok(())
            }
        }

        let mut rng = test_rng();
        let secret = Fr::rand(&mut rng);
        let public = secret * secret;
        let circuit = SqrtCircuit {
            public: Some(public),
            secret: Some(secret),
        };

        let pk = generate_random_parameters_with_reduction(circuit.clone(), &mut rng).unwrap();
        let proof = create_random_proof(circuit, &pk, &mut rng).unwrap();

        let vk_bytes = serialize_vk(&pk.vk);
        let proof_bytes = serialize_proof(&proof);

        // Compressed Bn254 proof is exactly 128 bytes.
        assert_eq!(proof_bytes.len(), GROTH16_BN254_PROOF_LEN);

        let vk = deserialize_vk(&vk_bytes).expect("vk should roundtrip");
        let proof_rt = deserialize_proof(&proof_bytes).expect("proof should roundtrip");

        use ark_groth16::PreparedVerifyingKey;
        use ark_snark::SNARK;
        let pvk = PreparedVerifyingKey::from(vk);
        let valid = ark_groth16::Groth16::<Bn254>::verify_with_processed_vk(
            &pvk,
            &[public],
            &proof_rt,
        )
        .expect("verification should not error");
        assert!(valid);
    }

    /// The pure mod-*r* reduction must agree byte-for-byte with ark's
    /// `from_le_bytes_mod_order` + compressed serialization, including for
    /// non-canonical inputs (the common case for raw binding hashes).
    #[test]
    fn pure_reduction_matches_ark() {
        use ark_bn254::Fr;
        use ark_ff::{PrimeField, UniformRand};
        use ark_serialize::CanonicalSerialize;
        use ark_std::test_rng;

        // Deterministic boundary cases plus random values.
        let mut cases: Vec<[u8; 32]> = vec![[0u8; 32], [0xffu8; 32]];
        let mut modulus = [0u8; 32];
        for (i, limb) in BN254_MODULUS_LIMBS_LE.iter().enumerate() {
            for j in 0..8 {
                modulus[i * 8 + j] = ((limb >> (8 * j)) & 0xff) as u8;
            }
        }
        cases.push(modulus);
        cases.push(reduce_mod_bn254(&[0xabu8; 32]));
        for _ in 0..16 {
            let mut ser = Vec::new();
            Fr::rand(&mut test_rng())
                .serialize_compressed(&mut ser)
                .expect("serialize");
            let mut b = [0u8; 32];
            b.copy_from_slice(&ser[..32]);
            cases.push(b);
        }

        for bytes in cases {
            let reduced = reduce_mod_bn254(&bytes);
            assert!(
                is_canonical_field_element(&reduced),
                "reduction must always produce a canonical element"
            );
            let ark_reduced = Fr::from_le_bytes_mod_order(&bytes);
            let mut ark_bytes = Vec::new();
            ark_reduced
                .serialize_compressed(&mut ark_bytes)
                .expect("serialize");
            assert_eq!(
                reduced.as_slice(),
                ark_bytes.as_slice(),
                "pure reduction diverges from ark for input {bytes:?}"
            );
        }
    }
}
