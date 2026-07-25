# Network-Error Toast & Client Request Timeout

Closes [#924](https://github.com/Remitwise-Org/Remitwise-Frontend/issues/924) ·
Closes [#978](https://github.com/Remitwise-Org/Remitwise-Frontend/issues/978)

## Overview

Two related enhancements that improve UX when an `apiClient` request fails at
the transport level:

1. **Soft-error toast (#924):** Any transport failure (network down, timeout
   exhausted) automatically shows a non-blocking toast: "Something went wrong.
   Retry?" with an inline Retry button. No call-site code required.

2. **30 s client-side timeout (#978):** A hard outer budget covers the entire
   lifecycle of every `apiClient` request — per-attempt timeouts, retry
   backoffs, and the session-refresh replay. Any request that does not resolve
   within 30 s is aborted and the soft-error toast fires.

---

## Files

| File | Purpose |
|------|---------|
| `lib/client/networkErrorEvent.ts` | `NETWORK_ERROR_EVENT`, `NetworkErrorDetail`, `dispatchNetworkError()` |
| `lib/hooks/useNetworkErrorToast.ts` | `useNetworkErrorToast` hook + `NetworkErrorToastProvider` |
| `lib/config/fetch-timeouts.ts` | `CLIENT_REQUEST_TIMEOUT_MS = 30_000` (single constant, single source of truth) |
| `lib/client/apiClient.ts` | Integrates both: 30 s outer `AbortController`, event dispatch on failure |
| `components/Providers.tsx` | Mounts `NetworkErrorToastProvider` inside `ToastProvider` globally |
| `tests/unit/apiClient.network-toast.test.ts` | 13 tests — event dispatch + outer timeout |
| `tests/unit/hooks/useNetworkErrorToast.test.tsx` | 13 tests — hook rendering, Retry action, lifecycle |

---

## Public API

### `CLIENT_REQUEST_TIMEOUT_MS` (#978)

```ts
import { CLIENT_REQUEST_TIMEOUT_MS } from '@/lib/config/fetch-timeouts';
// → 30_000
```

Single authoritative constant for the `apiClient` outer request budget. **Do not
inline this value** at call sites — always reference the constant.

Override per call via `ApiClientOptions.requestTimeout`:

```ts
// Tighter 10 s budget for a lightweight status call
apiClient.get('/api/health', { requestTimeout: 10_000 });

// Disable the outer guard for a long-running upload (use with care)
apiClient.post('/api/upload', { body: file, requestTimeout: 0 });
```

---

### `dispatchNetworkError(detail)` (#924)

```ts
import {
  dispatchNetworkError,
  NETWORK_ERROR_EVENT,
} from '@/lib/client/networkErrorEvent';
import type { NetworkErrorDetail, NetworkErrorEvent } from '@/lib/client/networkErrorEvent';
```

Dispatches a `network-error` `CustomEvent` on `window`. Called internally by
`apiClient`; exported for testing and other HTTP layers that want the same toast.

Safe to call in SSR contexts — silently skipped when `window` is not available.

#### `NetworkErrorDetail`

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | URL of the request that failed |
| `retry` | `() => void` | Callback to re-issue the same request |
| `isTimeout` | `boolean` | `true` when failure was a `DOMException` with `name === 'TimeoutError'` |

---

### `useNetworkErrorToast()` (#924)

```ts
import { useNetworkErrorToast } from '@/lib/hooks/useNetworkErrorToast';
```

React hook. Attaches a `window` listener for `network-error` events and calls
`useToast()` to show the toast. Must be used inside a `ToastProvider`.

The listener is removed automatically on unmount — no cleanup needed by callers.

---

### `NetworkErrorToastProvider` (default export) (#924)

```tsx
import NetworkErrorToastProvider from '@/lib/hooks/useNetworkErrorToast';

// Inside <ToastProvider>:
<NetworkErrorToastProvider />
```

Zero-output component that mounts `useNetworkErrorToast()` globally so the hook
is active for every `apiClient` call without individual pages opting in.
Already wired in `components/Providers.tsx`.

---

## Toast appearance

| Property | Value |
|----------|-------|
| `variant` | `"error"` |
| `title` | `"Something went wrong. Retry?"` |
| `description` | `"The request timed out."` (when `isTimeout: true`; omitted otherwise) |
| `action` | `{ label: "Retry", onClick: retry }` |
| `duration` | `0` (requires manual dismissal so user can still click Retry) |

---

## When it fires / when it does NOT fire

| Scenario | Fires? |
|----------|--------|
| Network unreachable (fetch rejects) | ✅ Yes |
| Per-attempt timeout exhausted after all retries | ✅ Yes |
| 30 s outer budget fires | ✅ Yes |
| Successful response (any HTTP status) | ❌ No |
| `4xx` / `5xx` HTTP response returned by server | ❌ No (caller handles) |
| Session-expiry `401` flow | ❌ No (handled by `SessionExpiryProvider`) |
| SSR / server-side code | ❌ No (`window` guard in `dispatchNetworkError`) |

---

## Architecture

```
apiClient.request()
  │
  ├── [arm 30 s outer AbortController — CLIENT_REQUEST_TIMEOUT_MS]  (#978)
  │
  ├── fetchWithRetry()
  │   └── per-attempt timeout + retries + session-refresh replay
  │
  ├── [success] → return Response
  │
  └── [catch: transport error or budget expired]
        │
        └── dispatchNetworkError({ url, retry, isTimeout })  (#924)
              │
              window 'network-error' CustomEvent
                    │
                    NetworkErrorToastProvider (mounted in Providers.tsx)
                    └── useNetworkErrorToast()
                          └── useToast() → error toast
                                "Something went wrong. Retry?"  [Retry]
```

---

## Backwards Compatibility

- `ApiClientOptions` gains two new **optional** fields (`requestTimeout`,
  `_outerController`). All existing call sites that omit them receive the new
  default behavior automatically — no migration required.
- The public method surface of `apiClient` is unchanged.
- `fetchWithTimeout` is unchanged.
- The `network-error` window event is brand new; no existing listener registered it.
- No CSS or design-token changes — uses the existing `error` variant tokens.

---

## Tests

```bash
# Run only the new feature tests
node node_modules/vitest/vitest.mjs run \
  tests/unit/apiClient.network-toast.test.ts \
  tests/unit/hooks/useNetworkErrorToast.test.tsx

# Run the full unit suite (both new files are wired into npm test)
npm test
```

Test coverage:
- `dispatchNetworkError` — event construction, SSR guard, detail payload
- `useNetworkErrorToast` — toast title, description, Retry action, variant, isTimeout flag
- Listener mount/unmount lifecycle
- `NetworkErrorToastProvider` renders null
- apiClient: event fires on network error, timeout, does not fire on success / HTTP errors / session expiry
- `CLIENT_REQUEST_TIMEOUT_MS` constant value
- 30 s outer budget aborts request, custom budget override, `requestTimeout: 0` disables
