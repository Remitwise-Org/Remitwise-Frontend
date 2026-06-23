# Contract Cache Layer

The Remitwise frontend utilizes a cached contract layer (`lib/cache/contract-cache.ts`) for Soroban read-only contract calls. This design pattern reduces the volume of redundant RPC calls, enforces input validation, prevents DoS vectors, and minimizes latency.

---

## Architecture & Lifecycle Flow

```
[Client/API Component]
         │
         ▼
[Cached Wrapper (e.g., remittance-split-cached.ts)]
         │
         ▼
[lib/cache/contract-cache.ts] ◄───► [lru-cache Memory Store]
         │ (Cache Miss or Expired TTL)
         ▼
[Original Wrapper (e.g., remittance-split.ts)]
         │
         ▼
[Soroban Contract (via RPC)]
```

### 1. Read / Cache Flow
- **Request**: A cached wrapper method (e.g., `getSplit`) is called.
- **Validation**: Inputs (contract ID, method name, TTL, arguments) are validated to prevent cache poisoning, ReDoS, or DoS attacks.
- **Cache Lookup**: A deterministic cache key is generated based on:
  ```
  contractId:methodName:JSON.stringify(sortedArguments)
  ```
- **Cache Hit**: If the entry exists and the timestamp is within the TTL window, the cached data is returned directly.
- **Cache Miss / Expiry**: If the entry is absent, expired, or a TTL mismatch is detected, the wrapper executes the underlying RPC fetch function, validates that it returned a non-null/non-undefined value, updates the cache, and returns the fresh data.
- **In-Flight Coalescing**: On a miss, the layer records the pending fetch promise in an in-flight map keyed by the cache key. If additional callers miss the **same** key while that fetch is still pending, they `await` the existing promise instead of issuing their own RPC call. This collapses N concurrent cold-cache misses (e.g. the dashboard fanning out parallel reads) into a single RPC round-trip.

### In-Flight Request Coalescing

The dashboard aggregate (`lib/contracts/dashboard-aggregate.ts`) issues several contract reads in parallel. With a cold cache, each would otherwise trigger its own Soroban RPC call for the same key. Coalescing guarantees **one fetch per key per in-flight window**:

```
[caller A miss] ─┐
[caller B miss] ─┼─►  inFlight[key]  ──►  fetchFn()  ──►  cache.set(key)
[caller C miss] ─┘        (one shared promise; A/B/C all resolve from it)
```

Guarantees (all transparent to consumers — no API change):
- **Single fetch**: Concurrent misses for the same key share one `fetchFn` invocation.
- **Cleanup on settle**: The in-flight entry is removed in a `finally` block on **both** resolve and reject, so a failed fetch never leaves a dangling/stuck pending entry.
- **No poisoning on failure**: A rejected fetch caches nothing and rejects every coalesced waiter with the same error; the next call retries from scratch.
- **TTL / registry preserved**: TTL validation, TTL-confusion protection, and registry-driven clears are unchanged. `clearCache()` (including via `clearRegisteredCaches()`) also drops the in-flight map; any already-pending flight still settles and cleans up its own entry harmlessly, and callers arriving after the clear start fresh.

### 2. Cache Invalidation Flow
Caches can be invalidated in two ways:
- **Automatic (TTL Expiry)**: Entries are automatically discarded upon the next read request if their age exceeds `ttlSeconds`.
- **Manual Invalidation**: Initiated programmatically via helper functions or externally via the API invalidation endpoint.

### 3. Registry
The cache registry (`lib/cache/registry.ts`) manages and tracks all active caching subsystems.
- Caches register their clearing functions using `registerCache(name, clearFn)`.
- Bulk operations can list (`listRegisteredCaches()`) or flush (`clearRegisteredCaches()`) all registered caches.

---

## Invalidation Endpoint (`app/api/cache/invalidate/route.ts`)

The application exposes an internal API for cache administration.

### POST `/api/cache/invalidate`
Performs targeted or bulk invalidation.

**Request Body Schema:**
- `clearAll` (boolean, optional): Set to `true` to completely wipe all cached data.
- `pattern` (string, optional): Invalidate all cache keys containing this string (e.g., `"INSURANCE_CONTRACT"`).
- `contractId` (string, optional): Invalidate entries associated with a contract ID.
  - `method` (string, optional): Target a specific method under the contract.
    - `args` (object, optional): Target a specific call with exact arguments.

*Example payload to invalidate a specific split configuration:*
```json
{
  "contractId": "REMITTANCE_SPLIT_CONTRACT",
  "method": "getSplit",
  "args": { "env": "testnet" }
}
```

### GET `/api/cache/invalidate`
Retrieves cache statistics.
- **Query Params**: `includeKeys=true` (only returns keys in development mode).
- **Response**: Returns metrics like `size`, `maxSize`, `itemCount`, `hitRate`, and `missRate`.

---

## Edge Cases & Caching Constraints

> [!CAUTION]
> Stale data in remittance and financial systems can lead to double-spends, incorrect balances, and transaction failures.

### What Must NEVER Be Cached
1. **Write Operations**: Methods that compile, submit, or execute transactions (e.g., `buildTransferTx`, `submitPayment`) must **never** be wrapped in `cachedContractCall`.
2. **Post-Transaction Balances**: Do not cache user balances or policy states right after a transaction/transfer has completed. Always read fresh data from the chain or explicitly trigger a manual cache invalidation for the affected user's address/ID.
3. **Transient States**: Temporary states, validation tokens, or fast-changing queue items.

### Key Lifecycle Scenarios
- **Cache Miss**: The cache is empty or doesn't have the entry. The system degrades gracefully to perform the RPC request.
- **Manual Invalidation**: Used after state-changing write operations. The entry is removed instantly so the next read fetches fresh data.
- **TTL Expiry**: The key has passed its time-to-live threshold. It is deleted on the next read attempt and refreshed.
- **TTL Confusion Protection**: If a cached entry is fetched with a different TTL than the current call's TTL, the cache layer invalidates the old entry and triggers a fresh fetch to prevent TTL confusion.
- **Concurrent Misses (Coalescing)**: Simultaneous misses for the same key await a single shared fetch rather than each calling the RPC. See [In-Flight Request Coalescing](#in-flight-request-coalescing).
- **Failed In-Flight Fetch**: A rejected coalesced fetch clears its in-flight entry, caches nothing, and rejects all waiters; the subsequent call retries cleanly.

---

## Step-by-Step Recipe: Adding a New Cached Read

To add a new cached read, follow this recipe modeled after `lib/contracts/remittance-split-cached.ts`:

### Step 1: Update Constants in `lib/cache/contract-cache.ts`
1. Add a contract ID mapping in `CONTRACT_IDS` (if it's a new contract).
2. Add a default TTL config (in seconds) in `CACHE_TTL`.

```typescript
export const CACHE_TTL = {
  // ...
  getNewData: 45, // Add your new method here
} as const;
```

### Step 2: Create the Cached Wrapper File
Create a new file `lib/contracts/your-contract-cached.ts` (or append to an existing cached wrapper).

```typescript
import { cachedContractCall, CONTRACT_IDS, CACHE_TTL, CacheError } from '@/lib/cache/contract-cache';
import * as originalContract from './your-contract';

/**
 * Get data with caching and error handling.
 * 
 * @param param - Query parameter
 * @returns Cached or freshly fetched contract data
 * @throws CacheError on validation failures
 * @throws Error on RPC failures
 */
export async function getNewData(param: string): Promise<DataResult | null> {
  // 1. Perform parameter validation (essential for security and key serialization)
  if (!param || typeof param !== 'string') {
    throw new Error('Param must be a non-empty string');
  }

  try {
    // 2. Wrap the call with cachedContractCall
    return await cachedContractCall(
      CONTRACT_IDS.YOUR_CONTRACT,
      'getNewData',
      { param },
      CACHE_TTL.getNewData,
      async () => await originalContract.getNewData(param)
    );
  } catch (error) {
    // 3. Propagate CacheErrors as-is
    if (error instanceof CacheError) {
      throw error;
    }
    // 4. Wrap RPC/Contract errors with context
    throw new Error(
      `Failed to get new data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    );
  }
}
```
