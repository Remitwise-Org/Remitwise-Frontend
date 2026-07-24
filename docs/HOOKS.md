# Client Hooks Catalog

This document catalogs the shared client hooks in the RemitWise frontend. Use these hooks instead of re-implementing form-submission or session-management logic ad hoc.

---

## Table of Contents

1. [useFormAction](#useformaction)
2. [useSessionExpiry](#usesessionexpiry)
3. [useLocalStorage](#uselocalstorage)

---

## useLocalStorage

**File:** [`lib/hooks/useLocalStorage.ts`](../lib/hooks/useLocalStorage.ts)

A hook that reads and writes to `localStorage` with SSR-safe defaults. Guards against `localStorage` access during server render so hydration never mismatches.

### Signature

```ts
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void]
```

### Return tuple

| Index | Name | Type | Description |
|-------|------|------|-------------|
| `[0]` | `storedValue` | `T` | Current value (falls back to `initialValue` when nothing is stored or during SSR) |
| `[1]` | `setValue` | `(value: T \| ((prev: T) => T)) => void` | Updates the value and persists it to `localStorage`. Supports functional updates like `useState`. |

### Error handling

- Wraps `localStorage` reads/writes in try-catch so a corrupt value, quota error, or private-browsing restriction never crashes the app.
- Errors are logged via `console.warn` for debugging.

### Usage example

```tsx
'use client';

import { useLocalStorage } from '@/lib/hooks/useLocalStorage';

export default function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');

  return (
    <button onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}>
      Switch to {theme === 'light' ? 'dark' : 'light'} mode
    </button>
  );
}
```

### Notes

- **SSR-safe**: returns `initialValue` on the server and during the first client render; the stored value is hydrated in `useEffect`.
- **Cross-tab**: if the same key is written in another tab, this hook does **not** reactively re-render. Listen to the `storage` event separately if cross-tab sync is needed.
- Supports any JSON-serializable value (string, number, boolean, object, array, `null`).
- All errors are caught and logged with `console.warn`; they do not propagate.

---

## useFormAction

**File:** [`lib/hooks/useFormAction.ts`](../lib/hooks/useFormAction.ts)

Shared form-submission hook used across the Send, Split, NewPolicy, and Savings Goal flows. Wraps `useTransition` + `apiClient.request` to give every form the same in-flight cancel, unmount guard, and typed error surface.

### Signature

```ts
function useFormAction<T extends ActionState = ActionState>(
  url: string,
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE', // default: 'POST'
): readonly [state: T, formAction: (formData: FormData) => void, isPending: boolean]
```

### Return tuple

| Index | Name | Type | Description |
|-------|------|------|-------------|
| `[0]` | `state` | `T` | Current form state. On success, the parsed response body (or `{ success: string }`). On failure, `{ error: string }` and optionally `{ validationErrors: ValidationError[] }`. Empty object `{}` at rest. |
| `[1]` | `formAction` | `(FormData) => void` | Pass directly as the `action` prop of a `<form>`. Aborts any in-flight request before starting a new one (latest-wins). |
| `[2]` | `isPending` | `boolean` | `true` while the request is in-flight (`useTransition` pending). Disable submit buttons on this flag. |

### Error semantics

- **Network / abort errors** → `{ error: "Network error. Please try again." }`
- **Non-OK response with `ApiErrorResponse` body** → `{ error: payload.error.message }`
- **Validation errors** → `{ error: firstMessage, validationErrors: [...] }`
- **Session expiry** → `apiClient` handles the 401 → refresh → redirect flow internally; `formAction` returns early without updating state.

### Usage example

```tsx
import { useFormAction } from '@/lib/hooks/useFormAction';

export default function SendMoneyForm() {
  const [state, formAction, isPending] = useFormAction('/api/remittance/send');

  return (
    <form action={formAction}>
      <input name="amount" type="number" required />
      <input name="recipientId" required />

      {state.error && (
        <p role="alert" className="text-red-500">{state.error}</p>
      )}
      {state.success && (
        <p role="status" className="text-green-500">{String(state.success)}</p>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Sending…' : 'Send money'}
      </button>
    </form>
  );
}
```

### Notes

- `formAction` is memoized with `useCallback`; it is stable across re-renders unless `url` or `method` changes.
- The hook cancels in-flight requests on unmount, preventing React "state update on unmounted component" warnings.
- For `PUT`, `PATCH`, or `DELETE` flows, pass the method as the second argument: `useFormAction('/api/goals/123', 'PUT')`.

---

## useSessionExpiry

**File:** [`lib/client/useSessionExpiry.ts`](../lib/client/useSessionExpiry.ts)

Listens for global session-lifecycle window events and transforms them into local UI state. Manages a countdown timer, expiry detection from `localStorage`, and a server-side refresh call. Use this hook in layout components that need to show a "session expiring" modal or banner.

### Signature

```ts
function useSessionExpiry(): SessionExpiryState
```

### Return shape

```ts
interface SessionExpiryState {
  /** Current notification phase. */
  phase: 'none' | 'warning' | 'expired';
  /** User-facing copy for the active notification phase. */
  message: string;
  /** Seconds remaining in the warning-phase countdown (0 when not in warning). */
  countdown: number;
  /** True while a server-side session refresh is in flight. */
  isRefreshing: boolean;
  /** POST /api/auth/refresh; returns true on success, false on failure. */
  staySignedIn: () => Promise<boolean>;
  /** Redirect to '/' (the reconnect entry point). */
  reconnect: () => void;
  /** Reset all expiry UI state without redirecting. */
  clearExpiry: () => void;
}
```

### Phases

| Phase | Meaning | When it activates |
|-------|---------|-------------------|
| `'none'` | No session concern | Initial state; after `clearExpiry()` or `session-refresh` event |
| `'warning'` | Session expiring soon | `session-expiring` window event, or T−60 s before stored expiry |
| `'expired'` | Session has ended | `session-expired` window event, or countdown reaches zero |

### Window events consumed

| Event | Payload | Effect |
|-------|---------|--------|
| `session-expiring` | `{ countdown?: number, message?: string }` | Transitions to `'warning'`, starts countdown |
| `session-expired` | `{ message?: string }` | Transitions to `'expired'`, clears timers |
| `session-refresh` | — | Resets to `'none'` (clears warning/expired UI) |
| `session-login` | `{ expiresAt: number }` | Stores new expiry and arms warning/expiry timers |

### Refresh path

`staySignedIn()` is gated by `NEXT_PUBLIC_SESSION_REFRESH_ENABLED === 'true'`. When disabled it logs a warning and returns `false`. When enabled it:

1. POSTs to `/api/auth/refresh` via `apiClient`.
2. Stores the new `expiresAt` timestamp and re-arms the timers.
3. Dispatches `session-refresh` to clear the UI.

### Usage example

```tsx
'use client';

import { useSessionExpiry } from '@/lib/client/useSessionExpiry';

export default function SessionExpiryBanner() {
  const { phase, message, countdown, isRefreshing, staySignedIn, reconnect } =
    useSessionExpiry();

  if (phase === 'none') return null;

  return (
    <div role="alert" aria-live="assertive" className="fixed bottom-4 inset-x-4 z-50 ...">
      <p>{message}</p>

      {phase === 'warning' && (
        <>
          <span>Time remaining: {countdown}s</span>
          <button onClick={staySignedIn} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing…' : 'Stay signed in'}
          </button>
        </>
      )}

      {phase === 'expired' && (
        <button onClick={reconnect}>Reconnect wallet</button>
      )}
    </div>
  );
}
```

### Notes

- The hook automatically fetches `/api/auth/me` on mount to prime the expiry timer from the current server session.
- Expiry timestamps are persisted in `localStorage` under the key `remitwise_session_expiry` so the warning survives a tab refresh.
- All timers (`setInterval`, `setTimeout`) are cleared on unmount; it is safe to mount this hook in a single root layout.
- Do **not** use this hook for business-logic gating (e.g. hiding buttons) — rely on server-side session validation for that.
