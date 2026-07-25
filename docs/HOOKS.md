# Hooks

## `useIntersectionObserver`

**File:** `lib/hooks/useIntersectionObserver.ts`

Centralized single-element `IntersectionObserver` hook. Creates exactly one observer, registers the callback on the target, and calls `observer.disconnect()` automatically when the component unmounts or when a dependency changes.

**Cleanup contract:** `disconnect()` is always called in the effect's cleanup function. The callback is kept via a stable ref so it never stales and does not need to be listed as an effect dependency.

```tsx
import { useIntersectionObserver } from "@/lib/hooks/useIntersectionObserver";

// Returns a ref — attach it to the element you want to watch.
const sentinelRef = useIntersectionObserver<HTMLDivElement>(
  ([entry]) => {
    if (entry.isIntersecting) loadMore();
  },
  { rootMargin: "200px" }
);
return <div ref={sentinelRef} />;
```

Options extend `IntersectionObserverInit` plus:

| Option    | Type      | Default | Description                                              |
| --------- | --------- | ------- | -------------------------------------------------------- |
| `enabled` | `boolean` | `true`  | Set to `false` to disable the observer without unmounting |

An explicit `target` element or ref can be passed as the third argument when you need to observe an element that is not directly linked to the returned ref.

---

## `useScrollSpy`

**File:** `lib/hooks/useIntersectionObserver.ts`

Scroll-spy hook for multiple section elements. Observes every element whose `id` is listed in `sectionIds`, and calls `onActivate` with the id of whichever section is currently most visible in the viewport. Uses a **single** `IntersectionObserver` instance for all sections and calls `disconnect()` on cleanup.

```tsx
import { useScrollSpy } from "@/lib/hooks/useIntersectionObserver";

const SECTIONS = ["profile", "security", "preferences"] as const;

function SettingsPage() {
  const [activeId, setActiveId] = useState(SECTIONS[0]);
  useScrollSpy(SECTIONS, setActiveId, {
    rootMargin: "-20% 0px -60% 0px",
    threshold: [0, 0.25, 0.5, 0.75, 1],
  });
  // …
}
```

Options extend `IntersectionObserverInit` plus:

| Option    | Type      | Default | Description                                              |
| --------- | --------- | ------- | -------------------------------------------------------- |
| `enabled` | `boolean` | `true`  | Set to `false` to disable the observer without unmounting |

---

## `useInfiniteScrollObserver`

**File:** `lib/hooks/useInfiniteScrollObserver.ts`

Auto-triggers `onLoadMore` when a sentinel element scrolls into view. Delegates all observer lifecycle to `useIntersectionObserver` — there is a single place that owns `IntersectionObserver` cleanup.

Auto-loading is skipped when `IntersectionObserver` is not supported or when the user prefers reduced motion; in both cases the caller's manual "load more" trigger remains and must always be rendered.

```tsx
import { useInfiniteScrollObserver } from "@/lib/hooks/useInfiniteScrollObserver";

function TransactionList({ hasMore, loading, onLoadMore }) {
  const { sentinelRef, isObserverActive } = useInfiniteScrollObserver({
    hasMore,
    loading,
    onLoadMore,
    rootMargin: "200px",
  });

  return (
    <>
      {/* …items… */}
      <div ref={sentinelRef} aria-hidden="true" />
      {!isObserverActive && hasMore && (
        <button onClick={onLoadMore}>Load more</button>
      )}
    </>
  );
}
```

---

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
