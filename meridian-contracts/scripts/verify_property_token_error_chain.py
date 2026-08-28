#!/usr/bin/env python3
"""Verify PropertyToken error log hash chains off-chain.

Usage:
  python scripts/verify_property_token_error_chain.py errors.json
  python scripts/verify_property_token_error_chain.py --self-test

The JSON file must contain a top-level array of entries with these fields:
  - log_id: integer
  - account: 32-byte hex string
  - error_code: string
  - message: string
  - timestamp: integer
  - context: [["key", "value"], ...]
  - prev_error_hash: 32-byte hex string
  - entry_hash: 32-byte hex string
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from typing import Iterable, Sequence


ZERO_HASH = "0x" + ("00" * 32)


def compute_state_root(entry_hashes: Sequence[str]) -> str:
    """Compute the anchored hash chain for verified error entries."""
    root = bytes(32)
    for value in entry_hashes:
        root = hashlib.blake2b(root + decode_hex_32(value, "entry_hash"), digest_size=32).digest()
    return "0x" + root.hex()


def compact_encode(value: int) -> bytes:
    if value < 0:
        raise ValueError("compact integers must be non-negative")
    if value < 1 << 6:
        return bytes([(value << 2) & 0xFF])
    if value < 1 << 14:
        encoded = (value << 2) | 0b01
        return encoded.to_bytes(2, "little")
    if value < 1 << 30:
        encoded = (value << 2) | 0b10
        return encoded.to_bytes(4, "little")

    raw = value.to_bytes((value.bit_length() + 7) // 8, "little")
    length_descriptor = ((len(raw) - 4) << 2) | 0b11
    return bytes([length_descriptor]) + raw


def encode_u64(value: int) -> bytes:
    if value < 0 or value > 0xFFFFFFFFFFFFFFFF:
        raise ValueError(f"u64 out of range: {value}")
    return value.to_bytes(8, "little")


def decode_hex_32(value: str, field_name: str) -> bytes:
    normalized = value[2:] if value.startswith("0x") else value
    raw = bytes.fromhex(normalized)
    if len(raw) != 32:
        raise ValueError(f"{field_name} must be 32 bytes, got {len(raw)}")
    return raw


def encode_string(value: str) -> bytes:
    encoded = value.encode("utf-8")
    return compact_encode(len(encoded)) + encoded


def encode_context(context: Sequence[Sequence[str]]) -> bytes:
    output = bytearray(compact_encode(len(context)))
    for item in context:
        if len(item) != 2:
            raise ValueError("each context entry must contain exactly two strings")
        output.extend(encode_string(str(item[0])))
        output.extend(encode_string(str(item[1])))
    return bytes(output)


def normalize_hash(value: str) -> str:
    normalized = value.lower()
    if not normalized.startswith("0x"):
        normalized = "0x" + normalized
    if len(normalized) != 66:
        raise ValueError(f"invalid 32-byte hash: {value}")
    return normalized


def compute_entry_hash(entry: dict) -> str:
    payload = b"".join(
        [
            encode_u64(int(entry["log_id"])),
            decode_hex_32(entry["account"], "account"),
            encode_string(str(entry["error_code"])),
            encode_string(str(entry["message"])),
            encode_u64(int(entry["timestamp"])),
            encode_context(entry.get("context", [])),
            decode_hex_32(entry["prev_error_hash"], "prev_error_hash"),
        ]
    )
    digest = hashlib.blake2b(payload, digest_size=32).hexdigest()
    return "0x" + digest


def verify_entries(entries: Iterable[dict]) -> bool:
    entries = list(entries)
    previous_hash = ZERO_HASH

    for index, entry in enumerate(entries):
        actual_prev = normalize_hash(entry["prev_error_hash"])
        if actual_prev != previous_hash:
            print(
                f"chain break at index {index}: expected prev {previous_hash}, got {actual_prev}",
                file=sys.stderr,
            )
            return False

        expected_hash = compute_entry_hash(entry)
        actual_hash = normalize_hash(entry["entry_hash"])
        if expected_hash != actual_hash:
            print(
                f"hash mismatch at index {index}: expected {expected_hash}, got {actual_hash}",
                file=sys.stderr,
            )
            return False

        previous_hash = actual_hash

    anchored = bytes(32)
    for index, entry in enumerate(entries):
        anchored = hashlib.blake2b(
            anchored + decode_hex_32(entry["entry_hash"], "entry_hash"), digest_size=32
        ).digest()
        if entry.get("state_root") and normalize_hash(entry["state_root"]) != "0x" + anchored.hex():
            print(f"state root mismatch at index {index}", file=sys.stderr)
            return False

    return True


def make_self_test_entries() -> list[dict]:
    account = "0x" + ("11" * 32)
    entries: list[dict] = []
    previous_hash = ZERO_HASH

    for log_id, code in enumerate(["TOKEN_NOT_FOUND", "UNAUTHORIZED", "TOKEN_NOT_FOUND"]):
        entry = {
            "log_id": log_id,
            "account": account,
            "error_code": code,
            "message": f"sample message {log_id}",
            "timestamp": log_id + 1,
            "context": [["operation", "transfer_from"], ["token_id", str(100 + log_id)]],
            "prev_error_hash": previous_hash,
        }
        entry["entry_hash"] = compute_entry_hash(entry)
        previous_hash = entry["entry_hash"]
        entries.append(entry)

    root = bytes(32)
    for entry in entries:
        root = hashlib.blake2b(
            root + decode_hex_32(entry["entry_hash"], "entry_hash"), digest_size=32
        ).digest()
        entry["state_root"] = "0x" + root.hex()

    return entries


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("json_file", nargs="?", help="Path to a JSON file with error log entries")
    parser.add_argument("--self-test", action="store_true", help="Run the built-in verifier smoke test")
    args = parser.parse_args()

    if args.self_test:
        ok = verify_entries(make_self_test_entries())
        print("self-test passed" if ok else "self-test failed")
        return 0 if ok else 1

    if not args.json_file:
        parser.error("provide a JSON file or use --self-test")

    with open(args.json_file, "r", encoding="utf-8") as handle:
        entries = json.load(handle)

    if not isinstance(entries, list):
        raise ValueError("top-level JSON value must be an array")

    ok = verify_entries(entries)
    print("verification passed" if ok else "verification failed")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
