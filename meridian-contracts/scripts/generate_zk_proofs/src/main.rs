//! Groth16 (Bn254) proof generator for the PropChain ZK stack.
//!
//! Produces verification keys, proofs, and public inputs in the exact on-wire
//! format consumed by the on-chain verifiers:
//!
//! * `vk.bin`          — compressed `ark_groth16::VerifyingKey<Bn254>`
//! * `proof.bin`       — compressed `ark_groth16::Proof<Bn254>` (128 bytes)
//! * `public_input.bin`— compressed Bn254 scalar field element (32 bytes)
//! * `manifest.json`   — proof type, statement bytes, binding hash, VK hash
//!
//! The single public input is `BLAKE2b-256(statement)` — the same binding the
//! contracts compute for each entry point (see `docs/zk-integration.md`).
//!
//! ## Usage
//!
//! ```text
//! cargo run --release -- --proof-type identity --statement-hex 19f48c --out artifacts/identity
//! ```
//!
//! ## Demo circuit
//!
//! The bundled circuit proves knowledge of a factorization `a * b == public`
//! for the bound public value. It is *not* domain-specific: production
//! deployments must replace it with a circuit that proves the actual compliance
//! statement (age ≥ threshold, income ≥ minimum, model weights were used, …)
//! while keeping the single-public-input binding convention.

use ark_bn254::{Bn254, Fr};
use ark_ff::{Field, PrimeField, UniformRand};
use ark_groth16::{create_random_proof, Groth16, PreparedVerifyingKey, Proof, ProvingKey};
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use ark_snark::SNARK;
use blake2::{Blake2b512, Digest};
use rand::rngs::StdRng;
use rand::SeedableRng;
use serde::Serialize;
use sha2::Sha256;
use std::fs;
use std::path::PathBuf;

/// Factorisation circuit: proves knowledge of (a, b) with `a * b == public`.
///
/// Always satisfiable for any target public value (choose a random non-zero
/// `a`, set `b = public * a⁻¹`), which makes it convenient for plumbing tests
/// while still exercising the full R1CS → setup → prove → verify pipeline.
#[derive(Clone)]
struct FactorizationCircuit<F: Field> {
    public: Option<F>,
    a: Option<F>,
    b: Option<F>,
}

impl<F: Field> ConstraintSynthesizer<F> for FactorizationCircuit<F> {
    fn generate_constraints(self, cs: ConstraintSystemRef<F>) -> Result<(), SynthesisError> {
        let a = cs.new_witness_variable(|| self.a.ok_or(SynthesisError::AssignmentMissing))?;
        let b = cs.new_witness_variable(|| self.b.ok_or(SynthesisError::AssignmentMissing))?;
        let public = cs.new_input_variable(|| self.public.ok_or(SynthesisError::AssignmentMissing))?;
        cs.enforce_constraint(
            || "a * b == public",
            |lc| lc + a,
            |lc| lc + b,
            |lc| lc + public,
        )?;
        Ok(())
    }
}

/// BLAKE2b-256 (BLAKE2b-512 truncated to 256 bits) — matches the on-chain
/// `Blake2x256` binding used by the contracts.
fn blake2b_256(bytes: &[u8]) -> [u8; 32] {
    let mut hasher = Blake2b512::new();
    hasher.update(bytes);
    let out = hasher.finalize();
    let mut binding = [0u8; 32];
    binding.copy_from_slice(&out[..32]);
    binding
}

#[derive(Serialize)]
struct Manifest {
    proof_type: String,
    circuit: String,
    statement_hex: String,
    binding_hex: String,
    vk_hash_hex: String,
    public_input_hex: String,
    vk_len: usize,
    proof_len: usize,
}

fn main() {
    let mut proof_type = String::new();
    let mut statement_hex = String::new();
    let mut out_dir = PathBuf::from("artifacts");

    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--proof-type" => proof_type = args.next().expect("--proof-type requires a value"),
            "--statement-hex" => {
                statement_hex = args.next().expect("--statement-hex requires a value")
            }
            "--out" => out_dir = PathBuf::from(args.next().expect("--out requires a value")),
            other => panic!("unknown argument: {other}"),
        }
    }

    if proof_type.is_empty() || statement_hex.is_empty() {
        eprintln!(
            "usage: generate-zk-proofs --proof-type <name> --statement-hex <hex> [--out <dir>]"
        );
        std::process::exit(2);
    }

    let statement = hex::decode(&statement_hex)
        .unwrap_or_else(|e| panic!("invalid --statement-hex: {e}"));
    let binding = blake2b_256(&statement);
    let public = Fr::from_le_bytes_mod_order(&binding);

    // Deterministic RNG for reproducible artifacts.
    let mut rng = StdRng::from_seed([0x5E_u8; 32]);

    // Witness: a * b == public. Retry until `a` is invertible (non-zero).
    let (a, b) = loop {
        let a = Fr::rand(&mut rng);
        if let Some(inv) = a.inverse() {
            break (a, public * inv);
        }
    };

    let circuit = FactorizationCircuit {
        public: Some(public),
        a: Some(a),
        b: Some(b),
    };

    // Trusted setup (demo: random parameters). Production deployments must use
    // a ceremony or a designated issuer.
    let pk: ProvingKey<Bn254> = Groth16::<Bn254>::generate_random_parameters_with_reduction(
        circuit.clone(),
        &mut rng,
    )
    .expect("setup failed");

    // `create_random_proof` is a crate-root free function in ark-groth16 0.4
    // (only `generate_random_parameters_with_reduction` is associated with
    // `Groth16`).
    let proof: Proof<Bn254> = create_random_proof(circuit, &pk, &mut rng).expect("proving failed");

    // Sanity-check the produced proof locally before writing artifacts.
    let vk = pk.vk;
    let pvk = PreparedVerifyingKey::from(vk.clone());
    let valid = Groth16::<Bn254>::verify_with_processed_vk(&pvk, &[public], &proof)
        .expect("verification failed");
    if !valid {
        panic!("generated proof does not verify — this is a bug in the generator");
    }

    // Serialize in the compressed on-wire format.
    let mut vk_bytes = Vec::new();
    vk.serialize_compressed(&mut vk_bytes).expect("serialize vk");
    let mut proof_bytes = Vec::new();
    proof.serialize_compressed(&mut proof_bytes).expect("serialize proof");
    let mut public_bytes = Vec::new();
    public.serialize_compressed(&mut public_bytes).expect("serialize public input");

    assert_eq!(proof_bytes.len(), 128, "compressed Bn254 Groth16 proof must be 128 bytes");

    // VK fingerprint (opaque on-chain; SHA-256 here for auditability).
    let vk_hash: [u8; 32] = {
        let mut hasher = Sha256::new();
        use sha2::Digest as _;
        hasher.update(&vk_bytes);
        hasher.finalize().into()
    };

    fs::create_dir_all(&out_dir).expect("create out dir");
    fs::write(out_dir.join("vk.bin"), &vk_bytes).expect("write vk.bin");
    fs::write(out_dir.join("proof.bin"), &proof_bytes).expect("write proof.bin");
    fs::write(out_dir.join("public_input.bin"), &public_bytes).expect("write public_input.bin");

    let manifest = Manifest {
        proof_type: proof_type.clone(),
        circuit: "factorization: a * b == public".to_string(),
        statement_hex: hex::encode(&statement),
        binding_hex: hex::encode(&binding),
        vk_hash_hex: hex::encode(vk_hash),
        public_input_hex: hex::encode(&public_bytes),
        vk_len: vk_bytes.len(),
        proof_len: proof_bytes.len(),
    };
    fs::write(
        out_dir.join("manifest.json"),
        serde_json::to_string_pretty(&manifest).expect("serialize manifest"),
    )
    .expect("write manifest.json");

    println!("proof type : {proof_type}");
    println!("binding    : {}", hex::encode(binding));
    println!("vk hash    : {}", hex::encode(vk_hash));
    println!("proof len  : {} bytes", proof_bytes.len());
    println!("output dir : {}", out_dir.display());
    println!(
        "\nRegister the VK on-chain:\n  set_verification_key(proof_type, vk.bin, 0x{})",
        hex::encode(vk_hash)
    );
}
