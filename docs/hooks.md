## `useVisibilityChange`

Fires callbacks when the active browser tab transitions between visible and hidden states.

### Usage

```tsx
import { useVisibilityChange } from "@/lib/hooks/useVisibilityChange";

export function ActiveDataFetcher() {
  const isVisible = useVisibilityChange({
    onVisible: () => {
      // Re-fetch live data when user returns to tab
      refetch();
    },
    onHidden: () => {
      // Pause active polling timers
      pausePolling();
    },
    onChange: (visible) => {
      console.log("Tab visibility changed to:", visible);
    },
  });

  return <div>Tab active: {isVisible ? "Yes" : "No"}</div>;
}

## `useScrollSpy`

Observes multiple section elements and calls a callback with the id of the most-visible section. Backed by a single `IntersectionObserver` instance that is disconnected on unmount.

See [`docs/HOOKS.md`](./HOOKS.md) for full API reference and usage examples.
