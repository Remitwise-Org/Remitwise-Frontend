# Lazy Loading: Routes vs. Components

**Audience:** Contributors (frontend developers)

This guide explains when RemitWise relies on automatic route-level code-splitting versus when to reach for explicit component-level lazy loading with `next/dynamic`.

For fallback UI choice (`loading.tsx` vs. `Suspense` vs. manual state), see [docs/SUSPENSE.md](./SUSPENSE.md). For measuring the impact of a lazy-loading change, see [docs/BUNDLE_ANALYSIS.md](./BUNDLE_ANALYSIS.md). For route structure and naming, see [docs/ROUTING_PATTERNS.md](./ROUTING_PATTERNS.md).

## Routes are already lazy — you don't opt in

Next.js App Router code-splits every route segment (`page.tsx`, `layout.tsx`) automatically. Visiting `/dashboard` does not download the JS for `/settings`. This is free and requires no `dynamic()` call, no `React.lazy`, and no action from you — it falls directly out of how you structure files under `app/` (see [ROUTING_PATTERNS.md](./ROUTING_PATTERNS.md)).

Because of this, "lazy-load a route" in RemitWise doesn't mean wrapping a page in `dynamic()`. It means:

1. Structuring the route correctly under `app/` so the segment boundary is where you want the split.
2. Optionally wrapping the route's children in a loading/error boundary, using `LazyRouteShell` (`components/LazyRouteShell.tsx`):

```tsx
// app/(dashboard)/layout.tsx
import { LazyRouteShell } from '@/components/LazyRouteShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <LazyRouteShell>{children}</LazyRouteShell>;
}
```

`LazyRouteShell` combines a `Suspense` fallback with `ChunkErrorBoundary` (`components/ChunkErrorBoundary.tsx`), which catches chunk-load failures — a stale deploy, a network blip — and shows a "Reload page" retry UI instead of a blank screen. As of this writing it's documented as the recommended pattern for route boundaries but isn't yet wired into every route layout; check whether the layout you're touching already has one before adding your own.

## Components: lazy-load with `next/dynamic` when a component is heavy and not needed immediately

Use explicit component-level lazy loading when a *specific component inside an already-loaded route* is:

- **A heavy dependency** not needed for the initial paint — e.g. a charting library.
- **Client-only** — it can't (or shouldn't) render on the server, e.g. because it depends on browser APIs or a client-only library.
- **Not needed for the route's primary content** — below the fold, behind a tab, or conditionally rendered.

RemitWise does this today for chart components on the insights pages:

```tsx
// app/financial-insights/page.tsx
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { SkeletonChart } from '@/components/ui/Skeleton'

const SpendingVsSavingsChart = dynamic(
  () => import('@/components/Insights/spendingVsSavingChart').then(m => ({ default: m.SpendingVsSavingsChart })),
  { ssr: false },
)

export default function FinancialInsightsPage() {
  return (
    <Suspense fallback={<SkeletonChart type="bar" />}>
      <SpendingVsSavingsChart />
    </Suspense>
  )
}
```

The same pattern is used in `app/dashboard/insight/page.tsx` for `CategoryDonutChart` and `RemittanceTrendChart`.

Notes on this example:

- `{ ssr: false }` skips server rendering for the component — appropriate here since the charts are client-side visualizations not needed on the server-rendered pass.
- The `Suspense` fallback is a `SkeletonChart`, not `LazyRouteShell` — component-level lazy loading typically just needs a visual placeholder, not the retry/error handling a whole route boundary needs. See [SUSPENSE.md](./SUSPENSE.md#2-use-reactsuspense-for-lazydynamic-client-component-boundaries) for when a plain `Suspense` fallback is the right choice versus `LazyRouteShell` or manual error state.

## Decision guide

| Situation | Lazy-load how | Why |
|---|---|---|
| A new page or route segment | Nothing extra — just create it under `app/` | App Router splits by route segment automatically |
| Wanting retry UI if a route's chunk fails to load | Wrap the layout in `LazyRouteShell` | Combines `Suspense` + `ChunkErrorBoundary` for a route boundary |
| A heavy, below-the-fold, or client-only component inside a route (e.g. a chart) | `next/dynamic` + `Suspense` with a lightweight fallback | Keeps the component out of the initial bundle without route-level ceremony |
| Any component that's small or needed immediately for the route's primary content | Import normally — don't lazy-load it | Lazy-loading small components adds request overhead for no bundle-size benefit |

If you're not sure whether a component is "heavy" enough to warrant `next/dynamic`, check its impact with the bundle analyzer before adding the split — see [BUNDLE_ANALYSIS.md](./BUNDLE_ANALYSIS.md).

## Related docs

- [Suspense and manual loading patterns](./SUSPENSE.md)
- [Bundle analysis guide](./BUNDLE_ANALYSIS.md)
- [Routing patterns](./ROUTING_PATTERNS.md)
