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
