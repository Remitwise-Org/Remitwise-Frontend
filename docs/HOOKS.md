# Hooks

## `useEventListener`

**File:** `lib/hooks/useEventListener.ts`

`useEventListener` provides a single place to register DOM event listeners from a React component. The listener is automatically removed when the component unmounts or when its event target, event name, or options change.

The event name determines the event type at compile time:

```tsx
import { useEventListener } from "@/lib/hooks/useEventListener";

function EscapeHandler({ onEscape }: { onEscape: () => void }) {
  useEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      onEscape();
    }
  });

  return null;
}
```

The default target is `window`. A `Document`, `HTMLElement`, or React ref can be supplied when listening elsewhere:

```tsx
const buttonRef = useRef<HTMLButtonElement>(null);

useEventListener("click", () => {
  // Handle clicks on the button.
}, buttonRef);
```

The hook is safe to use in server-rendered components. It also keeps the latest handler without requiring callers to manually register and clean up listeners.

## `useNetworkErrorToast` (#924)

**File:** `lib/hooks/useNetworkErrorToast.ts`

Listens for the `network-error` window event dispatched by `apiClient` when a
request fails at the transport level and converts it into a soft-error toast:

> **"Something went wrong. Retry?"** [Retry]

The hook must be used inside a `ToastProvider`. Mount it once, globally, via
`NetworkErrorToastProvider` (already wired in `components/Providers.tsx`).

### `useNetworkErrorToast()`

```ts
import { useNetworkErrorToast } from "@/lib/hooks/useNetworkErrorToast";

// Inside a component that is a descendant of ToastProvider:
useNetworkErrorToast();
```

Attaches and cleans up the window event listener automatically. Returns `void`.

### `NetworkErrorToastProvider` (default export)

A zero-output component that mounts the hook so it can be placed anywhere in the
tree without adding a visible DOM node:

```tsx
import NetworkErrorToastProvider from "@/lib/hooks/useNetworkErrorToast";

// Inside <ToastProvider>:
<NetworkErrorToastProvider />
```

### Toast behavior

| Property | Value |
|----------|-------|
| `variant` | `"error"` |
| `title` | `"Something went wrong. Retry?"` |
| `description` | `"The request timed out."` when `isTimeout: true`; omitted otherwise |
| `action` | `{ label: "Retry", onClick: retry }` |
| `duration` | `0` (manual dismissal — user may want to click Retry) |

### Related

- [`lib/client/networkErrorEvent.ts`](../lib/client/networkErrorEvent.ts) — `dispatchNetworkError()`, event constants and types
- [`lib/client/apiClient.ts`](../lib/client/apiClient.ts) — dispatches the event on transport failure
- [`lib/config/fetch-timeouts.ts`](../lib/config/fetch-timeouts.ts) — `CLIENT_REQUEST_TIMEOUT_MS = 30_000`
- [`docs/toast-pattern.md`](toast-pattern.md) — full toast system documentation
- [`docs/client-api.md`](client-api.md) — `apiClient` contract and options
