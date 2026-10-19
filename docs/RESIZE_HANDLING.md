# Resize Handling

**Audience:** Contributors

This guide documents the resize patterns that are already used in this repository. The current implementation relies mostly on CSS-based responsive design, with a small number of JavaScript hooks for container measurements and breakpoint-based UI changes.

---

## Why resize handling exists

Resize work is needed when the UI must react to viewport or container changes, such as:

- chart containers that need to reflow their drawing area
- mobile vs. desktop placeholder text
- layout adjustments that cannot be expressed cleanly with plain CSS

The repository keeps this work efficient by preferring CSS and shared hooks over ad hoc listeners. That avoids layout thrashing, unnecessary renders, and expensive work on every pixel change.

---

## Current architecture

### 1. Tailwind responsive utilities are the default approach

The primary pattern is CSS-first. Responsive classes are defined in [tailwind.config.js](../tailwind.config.js) with custom breakpoints for small mobile devices and larger tablets/desktops.

Custom screens include:

- `320:` for very small phones
- `375:` for the main mobile target
- `450:` for larger phones and foldables
- `tablet:` for tablets
- `laptop:` for landscape tablets
- `desktop:` for desktop layouts

Example from the codebase:

```tsx
<main className="max-w-7xl mx-auto px-5 320:px-6 375:px-7 sm:px-6 lg:px-8 py-7 375:py-8" />
```

This is the preferred option when a layout change can be expressed in utility classes.

### 2. Shared hooks cover the small amount of JS resize logic

The repository has a shared hook in [lib/hooks/useResizeObserver.ts](../lib/hooks/useResizeObserver.ts). It wraps the browser `ResizeObserver` API and cleans up on unmount.

```tsx
import { useResizeObserver } from '@/lib/hooks/useResizeObserver';

function ResizablePanel() {
  const ref = useResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      console.log('New size:', width, height);
    }
  });

  return <div ref={ref}>Resizable content</div>;
}
```

Key details:

- it returns a ref you attach to the target element
- it disconnects the observer on cleanup
- it skips gracefully when `ResizeObserver` is unavailable
- it uses a ref-based callback so observers are not recreated on every render

This hook exists, but the product UI currently uses it sparingly. Most responsive behavior is still handled by CSS and chart components.

### 3. Breakpoint-based UI uses `matchMedia`, not `window.resize`

When the code needs a JavaScript boolean for mobile vs. desktop behavior, the existing pattern is to use `window.matchMedia` and listen for `change` events.

Real example from [app/dashboard/transaction-history/components/transaction-history-search-input.tsx](../app/dashboard/transaction-history/components/transaction-history-search-input.tsx):

```tsx
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  if (typeof window === 'undefined') return;

  const mediaQuery = window.matchMedia('(max-width: 639px)');
  const updateMatch = () => setIsMobile(mediaQuery.matches);

  updateMatch();
  mediaQuery.addEventListener('change', updateMatch);

  return () => mediaQuery.removeEventListener('change', updateMatch);
}, []);
```

This is the repository’s preferred approach for JS breakpoint changes. It is more efficient than listening to `window.resize` on every pixel change.

### 4. Recharts uses responsive containers for chart reflow

Several chart components rely on Recharts’ `ResponsiveContainer`, which internally observes the chart’s parent size. Examples include [components/Dashboard/SixMonthTrendsWidget.tsx](../components/Dashboard/SixMonthTrendsWidget.tsx) and [components/Insights/remittanceTrendChart.tsx](../components/Insights/remittanceTrendChart.tsx).

```tsx
<div
  className="w-full h-[280px] sm:h-[320px]"
  role="img"
  aria-label={chartLabel}
>
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={chartData}>{/* chart content */}</LineChart>
  </ResponsiveContainer>
</div>
```

For charts, this is the normal path. No custom resize listener is required.

### 5. Generic event hooks exist, but resize listeners are not the main pattern

The repository also has [lib/hooks/useEventListener.ts](../lib/hooks/useEventListener.ts). It is a generic hook for DOM events, but the current resize implementation does not rely on it for window resize handling. In practice, contributors should prefer `matchMedia` or `ResizeObserver` over a raw window resize listener.

---

## Best practices

1. Prefer CSS over JS for layout changes.
   Use Tailwind breakpoints first whenever the change can be expressed in utility classes.

2. Use `matchMedia` for breakpoint booleans.
   If the UI needs to know whether it is mobile or desktop, use `window.matchMedia` and the `change` event.

3. Use `useResizeObserver` for element-sized measurements.
   Use the shared hook when a component needs the size of a specific container.

4. Always clean up observers and listeners.
   The repository pattern is to return a cleanup function from `useEffect`.

5. Debounce expensive work.
   When resize-driven work triggers API calls, large computations, or state changes, use [lib/hooks/useDebounce.ts](../lib/hooks/useDebounce.ts) or [lib/hooks/useDebouncedValue.ts](../lib/hooks/useDebouncedValue.ts).

6. Avoid reading layout during render.
   Do not read `clientWidth`, `offsetWidth`, or `getBoundingClientRect()` while rendering. Measure in `useEffect`.

7. Reuse existing helpers.
   Do not introduce a new resize hook or debounce utility unless the existing ones cannot cover the need.

---

## Common mistakes

### Forgetting cleanup

Do not create an observer or listener without a cleanup function.

```tsx
// Avoid
useEffect(() => {
  const observer = new ResizeObserver(() => {
    // work
  });
  observer.observe(element);
}, []);
```

### Adding a window resize listener for every breakpoint change

Avoid `window.addEventListener("resize", ...)` for simple responsive toggles. The current codebase uses `matchMedia` instead.

### Measuring DOM during render

Do not compute dimensions during render, since that can cause layout thrashing and repeated reflows.

### Creating a new ResizeObserver without disconnecting it

If a component creates a raw observer, make sure it disconnects on unmount and when the target changes.

---

## Adding new resize logic

Use the following decision guide:

- Use Tailwind when the change is purely visual and can be expressed with classes.
- Use `matchMedia` when the component needs a boolean for mobile/desktop behavior.
- Use `useResizeObserver` when the component needs the actual size of a specific DOM element.
- Use Recharts `ResponsiveContainer` for charts that need to size to their parent.
- Put new hooks in [lib/hooks](../lib/hooks) and keep the component logic small.

If the resize callback will trigger expensive work, debounce it instead of running it on every event.

---

## Related documentation

- [RESPONSIVE_BREAKPOINT_GUIDE.md](./RESPONSIVE_BREAKPOINT_GUIDE.md)
- [MOTION.md](./MOTION.md)
- [COMPONENT_STATES.md](./COMPONENT_STATES.md)

---

Last updated: 2026-07-26
