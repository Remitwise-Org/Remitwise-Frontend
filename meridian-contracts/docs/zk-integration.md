# Zero-Knowledge Integration (Groth16 / Bn254)

This document describes how zero-knowledge proofs are generated off-chain,
verified on-chain, and consumed across the PropChain contracts. It covers the
`zk-compliance`, `oracle`, `ai-valuation`, and `insurance` contracts introduced
by [Issue #629](https://github.com/PropChain/meridian/issues/629).

> **Status.** Real Groth16 verification is implemented. The bundled demo circuit
> (`scripts/generate_zk_proofs`) is a plumbing fixture — production deployments
> must replace it with a domain-specific circuit (see
> [Replacing the demo circuit](#replacing-the-demo-circuit)).

---

## 1. Overview

| Contract          | Role                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `zk-compliance`   | Stores per-proof-type Groth16 verification keys; verifies proofs; keeps a versioned key registry. |
| `oracle`          | Accepts ZK-attested property valuations without revealing source data.                           |
| `ai-valuation`    | Verifies proofs that a prediction was computed from registered model weights.                    |
| `insurance`       | Gates policyholders on verified compliance proofs (cross-contract query).                        |
| `propchain-traits`| Shared types: `ZkProofType`, `ZkProofStatus`, `ZkProofData`, `VerificationKeyRecord`, `ZkVerifyError`. |
| `contracts/lib`   | Pure, dependency-free payload-validation helpers (`zk` module) used by the fuzz/security suites.  |

### Cryptographic stack

- **Curve / pairing:** Bn254 (`ark-bn254 0.4`)
- **SNARK:** Groth16 (`ark-groth16 0.4`, `ark-snark 0.4`)
- **Fields:** `ark-ff 0.4`
- **Serialization:** `ark-serialize 0.4`, **compressed** format on the wire
- **Statement binding:** BLAKE2b-256 (`ink::env::hash::Blake2x256` on-chain,
  `hashlib.blake2b(digest_size=32)` / `blake2` crate off-chain)

### Feature flags

Real verification is compiled into `zk-compliance` and `ai-valuation` only when
the **`zk`** cargo feature is enabled. Without it:

- `zk-compliance` **rejects every proof** (never auto-approves);
- `verify_zk_proof_data` returns `ZkVerifyError::ZkUnavailable`;
- `ai-valuation::verify_model_execution_zk` returns `AIValuationError::ZkUnavailable`.

The oracle and insurance contracts do **not** depend on arkworks: they verify
attestations via cross-contract calls to `zk-compliance` (or query its
`is_zk_proof_valid`).

---

## 2. Wire format

| Artifact                  | Format                                                          | Size (Bn254)    |
| ------------------------- | --------------------------------------------------------------- | --------------- |
| Verification key (`vk`)   | compressed `ark_groth16::VerifyingKey<Bn254>`                   | ~352 bytes      |
| Proof                     | compressed `ark_groth16::Proof<Bn254>`                          | exactly 128 B   |
| Public input              | 32-byte little-endian canonical Bn254 scalar                    | 32 B            |

Public inputs must be **canonical** (strictly less than the group order
`21888242871839275222246405745257275088548364400416034343698204186575808495617`).
Non-canonical encodings are rejected to prevent input malleability.

### Statement binding convention

Every contract entry point binds its statement into a **single public input**:

```
public_input = BLAKE2b-256( SCALE(statement) ) mod r
```

where `r` is the Bn254 scalar field order
(`21888242871839275222246405745257275088548364400416034343698204186575808495617`).
The raw 32-byte hash is reduced modulo `r` — the exact semantics of
`ark_ff::PrimeField::from_le_bytes_mod_order` followed by canonical (compressed)
serialization, which is how the off-chain prover derives the public input.

> **Why the reduction matters.** A uniform 32-byte hash exceeds `r` with
> probability ≈ 81%, so the raw binding almost never equals the public input
> stored in a proof. Every on-chain path that compares or gates public inputs
> (the oracle's `submit_zk_valuation` binding check and zk-compliance's
> canonicality gate) must apply the same reduction. The pure `reduce_mod_bn254`
> helper is implemented in `contracts/lib/src/zk.rs` and mirrored in
> `contracts/zk-compliance/src/verification_keys.rs` and the oracle contract;
> the zk-compliance copy is cross-checked against ark in a `zk`-feature test.

The statements per entry point are:

| Entry point                                   | SCALE-encoded statement                          |
| --------------------------------------------- | ------------------------------------------------ |
| `zk-compliance::verify_identity_zk`           | `(age_requirement: u8, country_code: u16)`       |
| `zk-compliance::verify_financial_standing_zk` | `min_income_usd: u64`                            |
| `zk-compliance::verify_accredited_investor_zk`| constant `1u8`                                   |
| `zk-compliance::verify_property_ownership_zk` | `(property_id: [u8;32], owner_public_key: [u8;32])` |
| `zk-compliance::verify_address_ownership_zk`  | `address_hash: [u8;32]`                          |
| `zk-compliance::submit_confidential_transaction` | `(transaction_type: u8, amount: u128, asset_type: u8)` |
| `oracle::submit_zk_valuation`                 | `(property_id: u64, valuation: u128)`            |
| `ai-valuation::verify_model_execution_zk`     | `weights_commitment \|\| feature_hash \|\| BLAKE2b-256(predicted_value: u128)` |

SCALE integers are little-endian fixed width; `[u8; 32]` is raw; tuples are
concatenated. The Python driver in `scripts/generate_zk_proofs.py` implements
these exact encodings.

---

## 3. Generating proofs (off-chain)

### Prerequisites

- Rust toolchain (for the generator; arkworks requires no special setup)
- `cargo` on `PATH`

### One-shot generation

```bash
# identity proof for age >= 25 in jurisdiction 840 (US)
python scripts/generate_zk_proofs.py identity --age 25 --country 840

# financial standing proof for min income $120,000
python scripts/generate_zk_proofs.py financial --min-income 120000

# accredited investor proof
python scripts/generate_zk_proofs.py accredited

# oracle-attested valuation of $500,000 for property 1
python scripts/generate_zk_proofs.py oracle --property-id 1 --valuation 500000

# AI model-execution proof
python scripts/generate_zk_proofs.py model --property-id 1 --model-id linear_reg_v1 \
    --commitment <hex-32> --feature-hash <hex-32> --predicted 512000
```

### Outputs

```
scripts/zk_artifacts/<proof_type>/
├── vk.bin            # compressed VerifyingKey<Bn254>
├── proof.bin         # compressed Proof<Bn254>  (128 bytes)
├── public_input.bin  # compressed public input  (32 bytes)
└── manifest.json     # statement, binding, vk hash, sizes
```

The script prints the exact `set_verification_key(...)` arguments and, for the
oracle, the `submit_zk_valuation(...)` payload.

### The Rust tool directly

```bash
cd scripts/generate_zk_proofs
cargo run --release -- --proof-type identity --statement-hex 1903c4 --out artifacts/identity
```

The tool performs a local `setup → prove → verify` round-trip before writing
artifacts, so a generated `proof.bin` is guaranteed to verify against the
accompanying `vk.bin`.

### The demo circuit

`a * b == public` (factorization) — always satisfiable for any target public
value, so it exercises the full R1CS → setup → prove → verify pipeline without
curve/QR headaches. It proves knowledge of a decomposition of the bound value,
**not** a domain-specific compliance property.

### Replacing the demo circuit

1. Implement a circuit in `scripts/generate_zk_proofs/src/main.rs` implementing
   `ark_relations::r1cs::ConstraintSynthesizer<Fr>` that proves the real
   statement (e.g. `age >= threshold`, `income >= minimum`, `y == model(x)` for
   committed weights).
2. Keep the **single public input = BLAKE2b-256(SCALE(statement)) mod r**
   convention so the on-chain binding checks keep working.
3. Regenerate keys with a production setup procedure (ceremony / designated
   issuer), never the demo `StdRng::from_seed`.

---

## 4. Deploying and registering verification keys

1. Generate artifacts (section 3).
2. Deploy `zk-compliance` **with the `zk` feature**:
   ```bash
   cargo contract build --features zk   # in contracts/zk-compliance
   ```
3. As the contract owner, register a key per proof type:
   ```
   set_verification_key(ZkProofType::IdentityVerification, vk.bin, 0x<vk_hash>)
   ```
   Registration is versioned; `rotate_verification_key` bumps the version and
   `deactivate_verification_key` disables a key (all future verifications for
   that type fail). Invalid key bytes are rejected eagerly when the `zk` feature
   is enabled.
4. Point the oracle at the compliance contract:
   ```
   oracle::set_zk_compliance_contract(<zk-compliance-account>)
   ```
   Optionally set `insurance::set_zk_compliance_contract(...)` for policy
   gating.

---

## 5. Verification flow

### 5.1 On-chain (zk-compliance)

```
verify_zk_proof_data(proof_type, public_inputs, proof_data) -> Result<bool, ZkVerifyError>
```

1. Gate: payload length window + canonical public inputs.
2. Load the active `VerificationKeyRecord` for `proof_type` (else
   `VerificationKeyNotFound`).
3. `CanonicalDeserialize::deserialize_compressed` the VK and proof.
4. Map public inputs to `Fr` via `PrimeField::from_le_bytes_mod_order`.
5. `Groth16::<Bn254>::verify_with_processed_vk` over the prepared key.

The approved-verifier message `verify_zk_proof(account, proof_id, approve)` and
the wrapper entry points (`verify_identity_zk`, `verify_financial_standing_zk`,
`verify_accredited_investor_zk`, `verify_property_ownership_zk`,
`verify_address_ownership_zk`, `submit_confidential_transaction`) only mark a
proof `Verified` when verification succeeds; otherwise the proof is stored as
`Rejected` and the call fails with `Error::VerificationFailed`.

### 5.2 Oracle (cross-contract)

```
submit_zk_valuation(property_id, valuation, confidence_score, attestation: ZkProofData)
```

- Computes `binding = BLAKE2b-256((property_id, valuation).encode()) mod r`
  (same reduction the prover applies) and requires
  `attestation.public_inputs == [binding]` (local, no gas spent).
- Calls `verify_zk_proof_data` on the configured compliance contract.
- On success, stores a `ZkAttestedValuation` and routes the valuation through
  the standard pipeline **without the admin gate** — the cryptographic proof is
  the authority, so source data never needs to be revealed or trusted.

### 5.3 AI valuation

`register_model_commitment(model_id, weights_commitment, serialized_vk, vk_hash)`
binds a Groth16 key and a commitment of the off-chain weights to a registered
model. `verify_model_execution_zk(property_id, model_id, predicted_value,
feature_hash, proof_data)` verifies a proof that the prediction was computed
from those committed weights (weights stay off-chain), then records the attested
`AIPrediction`.

### 5.4 Insurance

`is_zk_compliant(account, proof_type) -> Option<bool>` queries the compliance
contract's `is_zk_proof_valid` so policy issuance flows can gate on
privacy-preserving attestations without exposing the underlying data.

---

## 6. Testing

### Unit / off-chain

- `contracts/lib/src/zk.rs`, `contracts/zk-compliance/src/verification_keys.rs`:
  pure validation helpers with boundary tests (payload window, canonical field
  elements around the Bn254 modulus, mod-`r` reduction properties).
- `contracts/zk-compliance/src/verification_keys.rs` (feature `zk`):
  full `setup → prove → serialize → deserialize → verify` round-trip test.
- `security-tests/src/zk_tests.rs`: adversarial proof tests — malformed
  payloads, non-canonical field elements, oversized public-input arrays
  (proptest + deterministic cases).
- `tests/fuzz_tests.rs`: fuzz tests for malformed-proof handling over the
  shared `stellar_insured_lib::zk` helpers.

### On-chain behavior without the `zk` feature

Proofs are rejected (never auto-approved); `verify_zk_proof_data` returns
`ZkUnavailable`. Default builds therefore remain safe even if a deployment
forgets the feature flag or fails to register keys.

### Running

```bash
# shared helpers
cargo test -p stellar-insured-lib
# security suite
cd security-tests && cargo test
# zk-compliance (real verification; compiles arkworks, slow)
cd contracts/zk-compliance && cargo test --features zk
```

---

## 7. Security considerations

- **Key rotation:** use `rotate_verification_key` promptly when a key is
  compromised; old versions are not auto-retained.
- **Malleability:** non-canonical public inputs are rejected.
- **Freshness:** the compliance contract ties proof validity to a one-year
  expiry; the oracle additionally binds each valuation to its proof via the
  statement hash.
- **Demo circuit:** see [Replacing the demo circuit](#replacing-the-demo-circuit).
  Never use the demo circuit or the seeded RNG in production.
- **Gas:** Groth16 verification on Bn254 is computationally heavy; consider
  verifying proofs off-chain and using cross-contract attestation summaries for
  high-throughput flows.
