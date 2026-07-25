# Client Hooks Catalog

This document catalogs the shared client hooks in the RemitWise frontend. Use these hooks instead of re-implementing form-submission or session-management logic ad hoc.

---

## Table of Contents

1. [useFormAction](#useformaction)
2. [useRouteTransition](#useroutetransition)
3. [useSessionExpiry](#usesessionexpiry)

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

## useRouteTransition

**File:** [`lib/hooks/useRouteTransition.ts`](../lib/hooks/useRouteTransition.ts)

Central place for page-transition animation logic. Returns CSS class names suitable for a page container element and automatically disables animations when the user prefers reduced motion (WCAG 2.1 AA – Success Criterion 2.3.3).

### Signature

```ts
function useRouteTransition(options?: {
  direction?: 'left' | 'right' | 'top' | 'bottom';
  duration?: 75 | 100 | 150 | 200 | 300 | 500 | 700 | 1000;
  animateOnMount?: boolean;
  className?: string;
}): {
  animationClasses: string;
  prefersReducedMotion: boolean;
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `direction` | `'left' \| 'right' \| 'top' \| 'bottom'` | `'left'` | Slide direction for the entering page. |
| `duration` | `75 \| 100 \| 150 \| 200 \| 300 \| 500 \| 700 \| 1000` | `300` | Animation duration in ms. Must be one of the supported Tailwind duration values. |
| `animateOnMount` | `boolean` | `true` | Set to `false` to avoid re-animating when the same route re-mounts. |
| `className` | `string` | `''` | Additional CSS class names appended to the result. |

### Return

| Property | Type | Description |
|----------|------|-------------|
| `animationClasses` | `string` | CSS class string for the page container. Returns empty string when reduced motion is active or `animateOnMount` is `false`. |
| `prefersReducedMotion` | `boolean` | The resolved OS reduced-motion preference. Use to gate any other JS-driven animations in the component. |

### Accessibility

- Animations are suppressed when `prefers-reduced-motion: reduce` is active, satisfying WCAG 2.1 AA Success Criterion 2.3.3 (Animation from Interactions).
- The hook internally delegates to `usePrefersReducedMotion` which reactively updates when the OS preference changes at runtime.

### Usage example

```tsx
'use client';

import { useRouteTransition } from '@/lib/hooks/useRouteTransition';

export default function Page() {
  const { animationClasses } = useRouteTransition({
    duration: 500,
    direction: 'right',
  });

  return (
    <main className={animationClasses}>
      <h1>Page content</h1>
    </main>
  );
}
```

### Notes

- The hook is a thin wrapper over `usePrefersReducedMotion` that maps the boolean to Tailwind animation classes.
- All animation class strings are literal values in the source file so Tailwind's JIT compiler can detect them at build time.
- For class-based animation gating in child elements use the exposed `prefersReducedMotion` boolean instead of calling `usePrefersReducedMotion` separately.

### Storybook

- `Hooks/useRouteTransition` (`Default`, `SlideFromRight`, `SlideFromTop`, `SlideFromBottom`, `Slow`, `Fast`, `ReducedMotion`)

### Tests

- `lib/hooks/useRouteTransition.test.ts` covers default output, direction/duration options, reduced-motion suppression, `animateOnMount`, custom className appending, and all supported direction/duration combinations.

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
