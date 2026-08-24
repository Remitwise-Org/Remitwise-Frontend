#!/usr/bin/env python3
"""Generate Groth16 (Bn254) proof artifacts for the PropChain ZK stack.

The heavy lifting (R1CS setup, proving, serialization) is done by the Rust tool
in ``scripts/generate_zk_proofs/`` — Python cannot implement the Bn254 pairing
math. This script:

1. computes the **statement bytes** for a given proof type using the same
   SCALE-encoding conventions the contracts use (see ``docs/zk-integration.md``),
2. invokes the Rust generator with those bytes as ``--statement-hex``,
3. validates the produced artifacts and prints the on-chain payloads
   (``set_verification_key`` arguments, proof bytes for ``submit_zk_proof``).

Example
-------
    python scripts/generate_zk_proofs.py identity --age 25 --country 840
    python scripts/generate_zk_proofs.py financial --min-income 120000
    python scripts/generate_zk_proofs.py accredited
    python scripts/generate_zk_proofs.py oracle --oracle-property-id 1 --valuation 500000
    python scripts/generate_zk_proofs.py model --model-id lin_v1 --predicted 512000
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import struct
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOL_DIR = ROOT / "scripts" / "generate_zk_proofs"
OUT_DIR = ROOT / "scripts" / "zk_artifacts"

# ---------------------------------------------------------------------------
# SCALE-encoding conventions (must match the contracts exactly)
# ---------------------------------------------------------------------------


def scale_u8(v: int) -> bytes:
    return struct.pack("<B", v)


def scale_u16(v: int) -> bytes:
    return struct.pack("<H", v)


def scale_u64(v: int) -> bytes:
    return struct.pack("<Q", v)


def scale_u128(v: int) -> bytes:
    return (v).to_bytes(16, "little")


def statement_for(proof_type: str, args: argparse.Namespace) -> bytes:
    """Return the statement bytes bound by the single proof public input."""
    if proof_type == "identity":
        # verify_identity_zk(age_requirement: u8, country_code: u16)
        return scale_u8(args.age) + scale_u16(args.country)
    if proof_type == "financial":
        # verify_financial_standing_zk(min_income_usd: u64)
        return scale_u64(args.min_income)
    if proof_type == "accredited":
        # verify_accredited_investor_zk() — constant marker 1u8
        return scale_u8(1)
    if proof_type == "property":
        # verify_property_ownership_zk(property_id: [u8;32], owner_public_key: [u8;32])
        pid = bytes.fromhex(args.property_id)
        if args.owner_key is None:
            raise SystemExit("--owner-key (32 bytes hex) is required for `property` proofs")
        key = bytes.fromhex(args.owner_key)
        if len(pid) != 32 or len(key) != 32:
            raise SystemExit("--property-id and --owner-key must each be 32 bytes (hex)")
        return pid + key
    if proof_type == "address":
        # verify_address_ownership_zk(address_hash: [u8;32])
        if args.address_hash is None:
            raise SystemExit("--address-hash (32 bytes hex) is required for `address` proofs")
        return bytes.fromhex(args.address_hash)
    if proof_type == "confidential":
        # submit_confidential_transaction(transaction_type: u8, amount: u128, asset_type: u8)
        return scale_u8(args.tx_type) + scale_u128(args.amount) + scale_u8(args.asset_type)
    if proof_type == "oracle":
        # submit_zk_valuation(property_id: u64, valuation: u128)
        return scale_u64(args.oracle_property_id) + scale_u128(args.valuation)
    if proof_type == "model":
        # verify_model_execution_zk: H(commitment || feature_hash || H(predicted_value))
        # Deterministic defaults derived from the model id keep the tool usable
        # out of the box; override to match a deployed model commitment.
        if args.commitment is None:
            args.commitment = blake2b_256(f"weights:{args.model_id}".encode()).hex()
        if args.feature_hash is None:
            args.feature_hash = blake2b_256(f"features:{args.model_id}".encode()).hex()
        commitment = bytes.fromhex(args.commitment)
        feature_hash = bytes.fromhex(args.feature_hash)
        if len(commitment) != 32 or len(feature_hash) != 32:
            raise SystemExit("--commitment and --feature-hash must each be 32 bytes (hex)")
        value_binding = blake2b_256(scale_u128(args.predicted))
        return commitment + feature_hash + value_binding
    raise SystemExit(f"unknown proof type: {proof_type}")


def blake2b_256(data: bytes) -> bytes:
    """BLAKE2b-256 = BLAKE2b-512 truncated to 32 bytes (matches ink Blake2x256)."""
    return hashlib.blake2b(data, digest_size=32).digest()


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------


def build_and_run(proof_type: str, statement: bytes, out: Path) -> Path:
    if not (TOOL_DIR / "Cargo.toml").exists():
        raise SystemExit(f"Rust tool not found at {TOOL_DIR}")

    cargo = shutil.which("cargo")
    if not cargo:
        raise SystemExit("cargo not found on PATH — cannot build the proof generator")

    subprocess.run(
        [cargo, "run", "--release", "--", "--proof-type", proof_type,
         "--statement-hex", statement.hex(), "--out", str(out)],
        cwd=TOOL_DIR,
        check=True,
    )
    return out


def validate_artifacts(out: Path, statement: bytes) -> dict:
    manifest = json.loads((out / "manifest.json").read_text())
    proof = (out / "proof.bin").read_bytes()
    if len(proof) != 128:
        raise SystemExit(f"bad proof length {len(proof)} (expected 128)")
    expected_binding = blake2b_256(statement)
    if manifest["binding_hex"] != expected_binding.hex():
        raise SystemExit("manifest binding does not match the statement bytes")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("proof_type", choices=[
        "identity", "financial", "accredited", "property", "address",
        "confidential", "oracle", "model",
    ])
    # identity
    parser.add_argument("--age", type=int, default=25)
    parser.add_argument("--country", type=int, default=840)
    # financial
    parser.add_argument("--min-income", type=int, default=120_000)
    # property / address
    parser.add_argument("--property-id", default="01")  # 32-byte hex for `property`
    parser.add_argument("--owner-key", default=None)
    parser.add_argument("--address-hash", default=None)
    # confidential
    parser.add_argument("--tx-type", type=int, default=0)
    parser.add_argument("--amount", type=int, default=100_000)
    parser.add_argument("--asset-type", type=int, default=0)
    # oracle (property id is a u64 here, default 1)
    parser.add_argument("--oracle-property-id", type=int, default=1)
    parser.add_argument("--valuation", type=int, default=500_000)
    # model
    parser.add_argument("--model-id", default="linear_reg_v1")
    parser.add_argument("--commitment", default=None)
    parser.add_argument("--feature-hash", default=None)
    parser.add_argument("--predicted", type=int, default=500_000)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    statement = statement_for(args.proof_type, args)
    out = Path(args.out) if args.out else OUT_DIR / args.proof_type
    out.mkdir(parents=True, exist_ok=True)

    build_and_run(args.proof_type, statement, out)
    manifest = validate_artifacts(out, statement)

    print(f"✓ artifacts in {out}/")
    print(f"  binding (BLAKE2b-256 of statement) : {manifest['binding_hex']}")
    print(f"  public input (binding mod r)       : {manifest['public_input_hex']}")
    print(f"  vk hash                            : 0x{manifest['vk_hash_hex']}")
    print(f"  vk size                            : {manifest['vk_len']} bytes")
    print(f"  proof size                         : {manifest['proof_len']} bytes")

    vk = (out / "vk.bin").read_bytes()
    print("\nOn-chain registration (zk-compliance owner):")
    print("  set_verification_key(")
    print(f"    ZkProofType::{args.proof_type},")
    print(f"    hex-encoded 0x{vk.hex()},")
    print(f"    0x{manifest['vk_hash_hex']},")
    print("  )")

    if args.proof_type == "oracle":
        # The on-chain binding check compares against the REDUCED public input
        # (binding mod r), not the raw BLAKE2b-256 hash — use public_input_hex.
        print("\nSubmit the attestation to the oracle:")
        print("  submit_zk_valuation(property_id, valuation, confidence, ZkProofData {")
        print(f"    proof_type: {args.proof_type}, public_inputs: [{manifest['public_input_hex']}],")
        print(f"    proof_data: 0x{(out / 'proof.bin').read_bytes().hex()}, ...")
        print("  })")
    return 0


if __name__ == "__main__":
    sys.exit(main())
