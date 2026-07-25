# Frame Budget Rules

**Audience:** Contributors (frontend developers) and Operators

This document outlines the performance frame‑budget guidelines that the RemitWise Frontend must adhere to. These budgets are enforced to ensure a smooth user experience across all supported devices.

## Rules

- **Scroll events:** Each scroll handler must complete in **≤ 16 ms** per frame. This keeps the UI at 60 fps without jank.
- **Click events:** Interaction handlers (e.g., button clicks) must complete in **≤ 100 ms** to provide immediate feedback.
- **Animation frames:** Any animation step must finish within **16 ms** to stay within the 60 fps budget.
- **Heavy calculations:** Off‑load expensive work to Web Workers or debounce/throttle the call.

## How to Verify

1. Open the Chrome DevTools Performance tab.
2. Record a short interaction (scroll, click, animation).
3. Look for the **Main** thread’s yellow bars. Ensure the duration of each task respects the limits above.
4. Use the `window.performance` API to log timings programmatically if needed:
   ```js
   const start = performance.now()
   // ...code...
   const duration = performance.now() - start
   console.log(`Task took ${duration.toFixed(2)} ms`)
   ```

## Examples

### Scroll Handler (React Hook)
```tsx
import { useCallback } from 'react'

export const useSmoothScroll = () => {
  const onScroll = useCallback((e: UIEvent) => {
    const start = performance.now()
    // ...handle scroll logic (e.g., lazy‑load, update state) ...
    const duration = performance.now() - start
    if (duration > 16) {
      console.warn('Scroll handler exceeded 16 ms')
    }
  }, [])

  return { onScroll }
}
```

### Click Handler
```tsx
const handleClick = (e: React.MouseEvent) => {
  const start = performance.now()
  // fast UI update
  setOpen(true)
  // optional async work
  setTimeout(() => {
    // heavy work deferred
  }, 0)
  const duration = performance.now() - start
  if (duration > 100) {
    console.warn('Click handler exceeded 100 ms')
  }
}
```

## Tooling

- **ESLint plugin:** `eslint-plugin-performance` can warn when a function exceeds the budget.
- **Storybook addon:** `@storybook/addon-performance` visualises render timings for components.

## References

- [Web Vitals – Largest Contentful Paint (LCP)](https://web.dev/lcp/)
- [Chrome DevTools Performance Guide](https://developer.chrome.com/docs/devtools/performance/)
- [Per-Route Load-Time Budgets](./LOAD_TIME_BUDGETS.md) — Lighthouse score floors, LCP ceilings, and server-side handler duration budgets for every page route.
- Internal performance budget ticket: `REM-1234` (private).
