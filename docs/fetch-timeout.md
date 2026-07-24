# Fetch Timeout Wrapper

`lib/fetch-timeout.ts` provides a drop-in `fetch` replacement that automatically
aborts requests exceeding a configurable deadline.  The deadline for every
endpoint is declared once in `lib/config/fetch-timeouts.ts` and re-used across
the codebase — no more inline magic numbers.

## Quick Start

```ts
import { fetchWithTimeout } from '@/lib/fetch-timeout';

// Timeout resolved automatically from the per-endpoint policy table.
const response = await fetchWithTimeout('/api/anchor/rates');

// Override the timeout explicitly for a one-off call.
const response = await fetchWithTimeout('/api/send', { method: 'POST', body }, 20_000);

// Works with a caller AbortController — both signals are merged.
const controller = new AbortController();
const response = await fetchWithTimeout('/api/goals', { signal: controller.signal });
```

## API Reference

### `fetchWithTimeout(url, options?, timeoutMs?)`

| Parameter   | Type                     | Default                              | Description                                                                                                   |
| ----------- | ------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `url`       | `string`                 | —                                    | The resource URL, passed straight through to `fetch`.                                                         |
| `options`   | `RequestInit`            | `{}`                                 | Standard Fetch API options.  A caller-supplied `signal` is respected and composed with the timeout signal.    |
| `timeoutMs` | `number` or `undefined`  | `getTimeoutForUrl(url)`              | Timeout in milliseconds.  When omitted the value comes from the per-endpoint policy table.  `0` disables it.  |

**Returns** `Promise<Response>` — resolves with the `Response`, or rejects with:

| Scenario                            | Error name       | Description                                               |
| ----------------------------------- | ---------------- | --------------------------------------------------------- |
| Deadline exceeded                   | `TimeoutError`   | `DOMException` with `name === 'TimeoutError'`.            |
| Caller `AbortController` fires      | `AbortError`     | Re-thrown as-is from the underlying `fetch`.              |
| Any other network/transport failure | varies           | Re-thrown unchanged.                                      |

### Distinguishing a timeout from a deliberate abort

```ts
try {
  const res = await fetchWithTimeout('/api/slow', {}, 3_000);
} catch (err) {
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    // deadline exceeded
  } else if (err instanceof DOMException && err.name === 'AbortError') {
    // caller aborted intentionally
  } else {
    // network error
  }
}
```

## Per-Endpoint Policy

All timeout values live in `lib/config/fetch-timeouts.ts`.  **Do not
hard-code timeouts at call sites** — add or update an entry in that file so the
policy stays auditable and consistent.

### Policy table

| Pattern                   | Constant                       | Value  | Rationale                                                  |
| ------------------------- | ------------------------------ | ------ | ---------------------------------------------------------- |
| `/api/auth/nonce`         | `AUTH_NONCE_TIMEOUT_MS`        | 5 s    | Lightweight; fail fast.                                    |
| `/api/auth/login`         | `AUTH_LOGIN_TIMEOUT_MS`        | 8 s    | Crypto verification on the server.                         |
| `/api/auth/refresh`       | `AUTH_REFRESH_TIMEOUT_MS`      | 5 s    | Token refresh must be fast so it doesn't block requests.   |
| `/api/anchor/deposit`     | `ANCHOR_DEPOSIT_TIMEOUT_MS`    | 15 s   | Provision interactive anchor session.                      |
| `/api/anchor/withdraw`    | `ANCHOR_WITHDRAW_TIMEOUT_MS`   | 15 s   | Provision interactive anchor session.                      |
| `/api/anchor/rates`       | `ANCHOR_RATES_TIMEOUT_MS`      | 5 s    | Cached CDN read; tight deadline.                           |
| `/api/anchor` (generic)   | `ANCHOR_DEFAULT_TIMEOUT_MS`    | 5 s    | Catch-all for other anchor routes.                         |
| `/api/send`               | `SEND_TIMEOUT_MS`              | 20 s   | Signs + propagates a Stellar transaction.                  |
| `/api/health`             | `HEALTH_TIMEOUT_MS`            | 3 s    | Uptime monitors; must be fast.                             |
| `/api/metrics`            | `METRICS_TIMEOUT_MS`           | 3 s    | Best-effort telemetry.                                     |
| `/api/contracts`          | `CONTRACT_READ_TIMEOUT_MS`     | 12 s   | Soroban RPC round-trip.                                    |
| `/api/goals`              | `CONTRACT_READ_TIMEOUT_MS`     | 12 s   | Soroban RPC round-trip.                                    |
| `/api/bills`              | `CONTRACT_READ_TIMEOUT_MS`     | 12 s   | Soroban RPC round-trip.                                    |
| `/api/insurance`          | `CONTRACT_READ_TIMEOUT_MS`     | 12 s   | Soroban RPC round-trip.                                    |
| `/api/split`              | `CONTRACT_READ_TIMEOUT_MS`     | 12 s   | Soroban RPC round-trip.                                    |
| `/api/family`             | `CONTRACT_READ_TIMEOUT_MS`     | 12 s   | Soroban RPC round-trip.                                    |
| _(anything else)_         | `DEFAULT_FETCH_TIMEOUT_MS`     | 10 s   | Safe default for unknown routes.                           |

### Matching algorithm

`getTimeoutForUrl(url)` iterates `ENDPOINT_TIMEOUTS` in declaration order and
returns the timeout for the **first** entry whose key appears anywhere in `url`
(`url.includes(key)`).  More-specific patterns must therefore appear **before**
more-general ones in the array.

```ts
import { getTimeoutForUrl } from '@/lib/config/fetch-timeouts';

getTimeoutForUrl('/api/anchor/rates');   // → 5_000  (ANCHOR_RATES_TIMEOUT_MS)
getTimeoutForUrl('/api/anchor/deposit'); // → 15_000 (ANCHOR_DEPOSIT_TIMEOUT_MS)
getTimeoutForUrl('/api/unknown');        // → 10_000 (DEFAULT_FETCH_TIMEOUT_MS)
```

### Adding a new endpoint timeout

1. Open `lib/config/fetch-timeouts.ts`.
2. Add a named constant: `export const MY_ROUTE_TIMEOUT_MS = 7_000;`
3. Add an entry to `ENDPOINT_TIMEOUTS` in the right position (more specific → less specific):
   ```ts
   ['/api/my-route', MY_ROUTE_TIMEOUT_MS],
   ```
4. Update this table in `docs/fetch-timeout.md`.

## Signal Composition

When `options.signal` is provided the wrapper merges both signals so the request
is cancelled when **either** the caller aborts **or** the deadline fires.  This
means you can pass a component-lifecycle controller and still get an automatic
timeout — the two do not interfere.

```ts
const controller = new AbortController();
useEffect(() => {
  fetchWithTimeout('/api/goals', { signal: controller.signal });
  return () => controller.abort(); // cancels on unmount, not a TimeoutError
}, []);
```

## Relationship to `apiClient`

`apiClient` (`lib/client/apiClient.ts`) has its own per-request timeout built
in (default 10 s, configurable via `timeout: number`).  Use it for
**authenticated browser requests** to RemitWise's own API routes because it also
handles session refresh and the `401 → refresh → retry once` flow.

Use `fetchWithTimeout` directly when:

- Code runs on the **server** (route handlers, server actions).
- You are calling a **third-party service** (e.g. the Anchor platform).
- You want the per-endpoint policy without the browser session machinery.

## Tests

Unit tests live at `tests/unit/fetch-timeout.test.ts` and cover:

- Happy path (successful response, options pass-through).
- Timeout fires → `TimeoutError` (fake timers).
- Caller abort → original error re-thrown.
- Signal composition (merged signal passed to `fetch`).
- Per-endpoint policy lookup (`getTimeoutForUrl` exhaustive).
- `ENDPOINT_TIMEOUTS` table sanity (no duplicate keys, positive integers).
