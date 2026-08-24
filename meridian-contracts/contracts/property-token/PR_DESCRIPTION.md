# fix(property-token): O(1) mapping lookup for `has_pending_bridge_request`

## Problem

`has_pending_bridge_request` in `contracts/property-token/src/lib.rs` (lines 1901–1918)
iterated from `1` to `bridge_request_counter` on every call, issuing one Soroban
storage read per request entry to check whether any of them were in `Pending` or
`Locked` state for the given token:

```rust
// BEFORE — O(n) linear scan
for i in 1..=self.bridge_request_counter {
    if let Some(request) = self.bridge_requests.get(i) {  // 1 storage read per iteration
        if request.token_id == token_id
            && matches!(request.status, BridgeOperationStatus::Pending | BridgeOperationStatus::Locked)
        {
            return true;
        }
    }
}
false
```

This function is called on every `initiate_bridge_multisig` invocation to guard against
duplicate requests. As request history accumulates the cost grows unboundedly, leading to:

- **Gas exhaustion** — each invocation of `initiate_bridge_multisig` becomes more expensive
  as history grows, eventually hitting gas limits even for legitimate users.
- **Denial-of-service** — an attacker can inflate `bridge_request_counter` by repeatedly
  initiating and completing/failing requests, making future calls prohibitively expensive.
- **Storage bloat** — the contract reads dead (completed/failed) entries on every duplicate
  check, wasting I/O on data that is no longer relevant.

**Severity:** Medium-High (matches audit finding #465)

---

## Solution

Introduce a dedicated `token_pending_requests: Mapping<TokenId, u64>` that stores the
active bridge `request_id` for each token. The mapping is kept in sync at exactly three
write sites, so `has_pending_bridge_request` becomes a single `contains()` call —
one storage read regardless of how many historical requests exist.

```rust
// AFTER — O(1) constant-time lookup
fn has_pending_bridge_request(&self, token_id: TokenId) -> bool {
    self.token_pending_requests.contains(token_id)
}
```

The mapping lifecycle is:

| Event | Action on `token_pending_requests` |
|---|---|
| `initiate_bridge_multisig` creates a request | `insert(token_id, request_id)` |
| `sign_bridge_request` — request **expires** | `remove(token_id)` |
| `sign_bridge_request` — operator **rejects** | `remove(token_id)` |
| `execute_bridge` — request **completes** | `remove(token_id)` |

This guarantees:
1. The entry is present for the full lifetime of a live (`Pending` / `Locked`) request.
2. The entry is removed the moment a request transitions to a terminal state, keeping the
   mapping lean and the duplicate-check accurate.

---

## Files Changed

### `contracts/property-token/src/lib.rs`

**Storage struct** — new field added to the cross-chain bridge mappings block:
```rust
/// O(1) lookup: tracks the active pending bridge request ID per token
token_pending_requests: Mapping<TokenId, u64>,
```

**Constructor** — field initialised alongside other bridge mappings:
```rust
token_pending_requests: Mapping::default(),
```

**`initiate_bridge_multisig`** — registers the new request immediately after persisting it:
```rust
self.bridge_requests.insert(request_id, &request);
self.token_pending_requests.insert(token_id, &request_id);  // ← new
```

**`sign_bridge_request`** — clears on expiry:
```rust
request.status = BridgeOperationStatus::Expired;
self.bridge_requests.insert(request_id, &request);
self.token_pending_requests.remove(request.token_id);  // ← new
return Err(Error::RequestExpired);
```

…and on rejection:
```rust
request.status = BridgeOperationStatus::Failed;
self.token_pending_requests.remove(request.token_id);  // ← new
self.env().emit_event(BridgeFailed { … });
```

**`execute_bridge`** — clears on successful completion:
```rust
request.status = BridgeOperationStatus::Completed;
self.bridge_requests.insert(request_id, &request);
self.token_pending_requests.remove(request.token_id);  // ← new
```

**`has_pending_bridge_request`** — full rewrite:
```rust
fn has_pending_bridge_request(&self, token_id: TokenId) -> bool {
    self.token_pending_requests.contains(token_id)
}
```

---

## Performance Impact

| Metric | Before | After |
|---|---|---|
| Complexity | O(n) where n = total historical requests | O(1) |
| Storage reads per duplicate check | Up to n | 1 |
| Gas cost growth over time | Linear — unbounded | Constant |
| DoS attack surface | High — inflatable via history | Eliminated |

---

## Testing

All existing bridge tests in `tests/property_token_tests.rs` and
`tests/integration_property_token.rs` exercise `initiate_bridge_multisig`,
`sign_bridge_request`, and `execute_bridge`. The mapping invariant (insert on creation,
remove on termination) is covered by those paths. No new failure modes are introduced;
the correctness contract of `has_pending_bridge_request` is identical to before —
it returns `true` iff the token has a live request in `Pending` or `Locked` state.

---

## Security Notes

- No admin keys or privileged paths were added.
- The fix is purely additive at the storage level; no existing data is migrated or removed.
- The `token_pending_requests` mapping starts empty and is self-consistent from the first
  transaction on the new contract version.

closes #465
