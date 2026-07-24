# Idempotency Contract & Documentation

This document describes the design, contract, constraints, and known limitations of the idempotency layer in the Remitwise application.

## Overview

Idempotency protects critical write endpoints (such as remittance transfers or payments) from duplicate execution due to network retries, double-clicking, or client failures. It ensures that making identical requests multiple times has the same effect as making a single request.

The idempotency layer is implemented across the following files:
* [store.ts](file:///home/ekwe/grantfox/Remitwise-Frontend/lib/idempotency/store.ts) – In-memory storage with TTL expiration support.
* [middleware.ts](file:///home/ekwe/grantfox/Remitwise-Frontend/lib/idempotency/middleware.ts) – HTTP Middleware to inspect, intercept, and cache responses.
* [config.ts](file:///home/ekwe/grantfox/Remitwise-Frontend/lib/idempotency/config.ts) – Key constants (TTL duration, header names, etc.).
* [index.ts](file:///home/ekwe/grantfox/Remitwise-Frontend/lib/idempotency/index.ts) – Main entrypoint exporting types and functions.

---

## Technical Contract

### Headers
* **Request Header:** `idempotency-key` (String, unique request identifier, typically a UUID v4).
* **Response Header (on replay):** `X-Idempotent-Replay: true` (indicates the response was served from cache).

### Storage Lifecycle
1. **First request:** Key is recorded in memory along with the SHA-256 hash of the request body.
2. **Success caching:** If the endpoint handler returns a success status (`2xx`), the response body and status code are cached. Non-`2xx` status codes (e.g. `4xx`, `5xx` errors) are **not** cached, allowing the client to retry the operation once corrected.
3. **Subsequent identical request:** If the key matches and the request body hash is identical, the cached response is replayed immediately with the `X-Idempotent-Replay: true` header.
4. **TTL Expiration:** Records are stored with a default time-to-live (TTL) of **24 hours**. Expirations are evaluated lazily on retrieval or cleaned up periodically.
5. **Periodic Sweep:** A periodic garbage collection sweep runs every **1 hour** to delete expired keys from the store.

---

## Findings & Edge Cases (Documented Bugs/Limitations)

During the creation of the test suite, we identified the following critical behaviors and contract deviations:

### 1. Concurrent Request Race Condition (Double-Spend Risk)
* **Finding:** If two identical requests containing the same `idempotency-key` are received concurrently *before the first request has finished and stored its response*, both requests bypass the cache check (since the key does not exist in the store yet). Consequently, both handlers are executed concurrently.
* **Impact:** High severity. Under high latency or rapid double-clicks, this can lead to double execution (e.g., executing a remittance payment twice).
* **Recommendation:** Introduce an in-flight status or lock (e.g., storing a `pending` record in the store immediately upon receipt) and return an intermediate status or block concurrent duplicates.

### 2. Configuration Non-Usage (Duplication)
* **Finding:** Neither `store.ts` nor `middleware.ts` actually imports or utilizes `config.ts`'s `IDEMPOTENCY_CONFIG`. The configurations for default TTL, cleanup interval, and header names are hardcoded inside the respective files:
  - `store.ts` defines its own local `DEFAULT_TTL_MS` (24h) and hardcoded `setInterval` interval of 1 hour.
  - `middleware.ts` defines its own local `IDEMPOTENCY_HEADER = 'idempotency-key'` and hardcoded header response `'X-Idempotent-Replay'`.
* **Impact:** Modifying `config.ts` will have no effect on runtime behavior, creating a silent maintenance hole.
* **Recommendation:** Refactor both files to import and honor `IDEMPOTENCY_CONFIG`.

### 3. Key Length Verification
* **Finding:** While `IDEMPOTENCY_CONFIG.MAX_KEY_LENGTH` is defined as `255`, there is no validation logic in `store.ts` or `middleware.ts` checking the key length. Extremely large keys (tested up to 10,000 characters) are accepted without warning.
* **Recommendation:** Enforce length checks at the middleware boundary before processing.
