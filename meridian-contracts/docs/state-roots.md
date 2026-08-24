# State roots

Each contract exposes `get_state_root()` as a read-only commitment to the
state observed after a successful transition. Canonical events include the
same value in their `state_root` field.

Soroban contracts advance the commitment when canonical events are emitted.
The shared implementation hashes each entry with the deterministic FNV-style
hasher used by the backend and builds a binary Merkle tree, duplicating the
last leaf when a level has an odd number of nodes.

Ink contracts use the platform Blake2x256 storage hash primitive. Their root
helpers use the same tree shape and return a 32-byte value. Consumers must
identify the contract family before comparing roots; roots from different
hash domains are not interchangeable.

The backend stores the event's root alongside its audit record. Proof
builders use that anchored root when it is present and retain local Merkle
calculation only for legacy records without an on-chain root. A verifier
should reject a proof if the anchored root does not match the proof result.
