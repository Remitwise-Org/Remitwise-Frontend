# Idempotency — Key Middleware, Store, and TTL Contract

This document describes the idempotency subsystem that guards money-moving POST routes from duplicate execution.

---

## Why idempotency matters

A remittance POST can be replayed by:
- A network retry after a timeout.
- The user double-clicking "Send".
- A client crash and reconnect that re-submits a form.

Without a guard, each replay executes a separate transfer. The idempotency layer detects duplicates and replays the original cached response instead of re-executing the handler — preventing double-spends.

---

## Files

| File | Purpose |
|------|---------|
| [`lib/idempotency/middleware.ts`](../lib/idempotency/middleware.ts) | HTTP layer: extracts the key, checks the store, stores responses |
| [`lib/idempotency/store.ts`](../lib/idempotency/store.ts) | In-memory TTL cache with periodic cleanup |
| [`lib/idempotency/config.ts`](../lib/idempotency/config.ts) | Centralised constants (TTL, header names, key limits) |
| [`lib/idempotency/types.ts`](../lib/idempotency/types.ts) | `IdempotencyRecord` and `IdempotencyCheckResult` types |
| [`lib/idempotency/index.ts`](../lib/idempotency/index.ts) | Re-exports everything for a single import path |

---

## Key header contract

Clients MUST send a unique, opaque string in the `idempotency-key` request header for every money-moving POST:

```
POST /api/remittance/send HTTP/1.1
idempotency-key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

- **Format:** any non-empty string up to 255 characters; UUID v4 is recommended.
- **Scope:** one key per logical operation, generated client-side before the first attempt.
- **Reuse:** retrying the exact same operation reuses the same key; a new operation MUST use a new key.

When a key is absent the middleware skips the idempotency check and the request is processed normally (no caching).

### Replay response

When the server replays a cached response it adds:

```
X-Idempotent-Replay: true
```

Clients can use this header to distinguish a fresh result from a replayed one (e.g. for analytics).

---

## `IdempotencyCheckResult` semantics

```ts
interface IdempotencyCheckResult {
  exists: boolean;   // true if the key is in the store and not expired
  record?: IdempotencyRecord; // present when exists === true
  conflict: boolean; // true when key exists but request body hash differs
}
```

| `exists` | `conflict` | Meaning |
|----------|-----------|---------|
| `false` | `false` | First time we see this key — execute the handler |
| `true` | `false` | Duplicate with matching body — replay cached response |
| `true` | `true` | Same key, different body — return `409 Conflict` |

---

## TTL and store behaviour

- **Default TTL:** 24 hours (`DEFAULT_TTL_MS = 24 * 60 * 60 * 1000` in `store.ts`).
- **Cleanup interval:** expired records are swept every 1 hour via `setInterval`.
- **Lazy expiry:** records are also checked and deleted on read, so a cleanup cycle is never required for correctness.
- **Shutdown hook:** the cleanup timer is registered with `registerShutdownHook('idempotency_cleanup', …)` so it is cleared on graceful server shutdown, preventing resource leaks.

### In-memory limitation

The current store is a `Map` held in the Node.js process. This means:

- **No persistence across restarts** — a server restart clears all records. Clients whose retry window overlaps a restart will re-execute their operation.
- **No cross-process sharing** — in a multi-replica deployment, two replicas may each receive one copy of a duplicate request and both execute it.

**For production** replace `store.ts` with a Redis or database backend that is shared across replicas and survives restarts.

---

## How to protect a new POST route

Use the `withIdempotency` wrapper from `lib/idempotency/middleware.ts`. The wrapper:

1. Parses the JSON body once.
2. Checks the store (returns `409` on conflict, replays on hit).
3. Calls your handler.
4. Caches the response body if the handler returns `2xx`.

```ts
// app/api/remittance/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withIdempotency } from '@/lib/idempotency/middleware';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withIdempotency(request, async (body) => {
    // `body` is the already-parsed JSON object.
    const { recipientId, amount, currency } = body as {
      recipientId: string;
      amount: number;
      currency: string;
    };

    // Execute the transfer exactly once.
    const result = await processRemittance({ recipientId, amount, currency });

    return NextResponse.json({ success: true, transferId: result.id }, { status: 201 });
  });
}
```

The client sends the key header:

```ts
await fetch('/api/remittance/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'idempotency-key': crypto.randomUUID(), // generate once, reuse on retry
  },
  body: JSON.stringify({ recipientId, amount, currency }),
});
```

---

## Known limitations

| Issue | Detail | Recommendation |
|-------|--------|----------------|
| **Concurrent race condition** | Two identical requests arriving simultaneously before the first completes both bypass the cache check, risking double-execution. | Store a `pending` sentinel immediately on receipt and block or queue concurrent duplicates. |
| **Config not imported** | `store.ts` and `middleware.ts` hardcode their TTL and header constants instead of importing from `config.ts`, making `config.ts` a no-op. | Refactor both files to import `IDEMPOTENCY_CONFIG`. |
| **No key-length enforcement** | `MAX_KEY_LENGTH = 255` is defined in `config.ts` but never enforced. | Add a length check in `getIdempotencyKey()`. |
| **In-memory store** | See [In-memory limitation](#in-memory-limitation) above. | Replace with Redis or a DB-backed store for multi-replica deployments. |
