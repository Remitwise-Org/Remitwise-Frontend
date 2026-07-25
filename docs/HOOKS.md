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
