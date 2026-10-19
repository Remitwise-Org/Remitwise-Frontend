# React Suspense and manual loading patterns

This guide is written for **frontend contributors** who implement route loading, data fetch states, and client-side component boundaries in the RemitWise app.

React `Suspense` is a powerful tool, but it is not the default way we handle every loading state in this repository. This document explains when RemitWise prefers:

- route-level loading placeholders (`loading.tsx`)
- explicit manual loading state in client components
- `React.Suspense` for code-split or lazy-loaded component boundaries

## Why this matters

This repository already uses multiple loading approaches:

- `app/dashboard/loading.tsx` renders a full dashboard skeleton while a route segment is resolving
- `components/LazyRouteShell.tsx` wraps lazy/dynamic children with `Suspense`
- `app/dashboard/insight/page.tsx` uses manual `useState` and `useEffect` to fetch API data and render a skeleton or retry UI

Picking the right pattern helps maintain consistent UX, avoid unnecessary flicker, and keep error and retry behavior predictable.

## 1. Use `loading.tsx` for route-level async loading

When a page or layout segment is async, prefer a Next.js App Router `loading.tsx` file in that segment.

Example:

```tsx
// app/dashboard/loading.tsx
import { DashboardLoadingSkeleton } from "@/components/ui/LoadingSkeletons";

export default function Loading() {
  return <DashboardLoadingSkeleton />;
}
```

Why this works:

- Next.js renders it automatically when the route segment is waiting for server-side data or a child segment
- it keeps page layout stable during route transitions
- it is the repository’s primary pattern for page-level placeholders

Use `loading.tsx` when the loading state is the route itself, not a child component inside the route.

## 2. Use `React.Suspense` for lazy/dynamic client component boundaries

Use `Suspense` when you want to show a fallback while a lazily loaded component or dynamically imported client-side module is initializing.

Example from the repo:

```tsx
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { SkeletonChart } from "@/components/ui/Skeleton";

const SpendingVsSavingsChart = dynamic(
  () => import("@/components/Insights/spendingVsSavingChart").then(m => ({ default: m.SpendingVsSavingsChart })),
  { ssr: false },
);

export default function FinancialInsightsPage() {
  return (
    <Suspense fallback={<SkeletonChart type="bar" />}>
      <SpendingVsSavingsChart />
    </Suspense>
  );
}
```

Use `Suspense` when:

- the component is code-split or dynamically imported
- the fallback UI is a visual placeholder only
- there is no custom retry/error flow inside that boundary

Do not use `Suspense` to hide API failures that need explicit retry or reporting. Use a manual error/loading/render branch instead.

## 3. Use `FeatureBoundary` to combine Suspense and ChunkErrorBoundary

For feature areas that require both a loading skeleton and explicit chunk-load/error handling, use the `FeatureBoundary` component.

```tsx
import { FeatureBoundary } from "@/components/FeatureBoundary";
import { SkeletonChart } from "@/components/ui/Skeleton";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";

export default function MyFeature() {
  return (
    <FeatureBoundary
      loadingFallback={<SkeletonChart type="bar" />}
      errorFallback={<ErrorDisplay />}
    >
      <LazyComponent />
    </FeatureBoundary>
  );
}
```

This component encapsulates `Suspense` and `ChunkErrorBoundary`, ensuring consistent loading and error recovery UX across feature areas.

## 4. Use manual loading state for data fetches and retry flows

This repository prefers explicit `loading` / `error` / `data` state branches for data fetching inside client components.

Example:

```tsx
import { useEffect, useState, useCallback } from "react";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { WidgetErrorState } from "@/components/ui/WidgetStates";
import { apiClient } from "@/lib/client/apiClient";

export default function InsightPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient.getJson("/api/insights")
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <SkeletonCard variant="chart" />
        <SkeletonCard variant="chart" />
      </div>
    );
  }

  if (error) {
    return (
      <WidgetErrorState
        title="Failed to load insights"
        message={error.message || "An unexpected error occurred."}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return <div>{/* render loaded content */}</div>;
}
```

Manual state is the right choice when:

- you need to show an explicit retry button or error message
- the loading UI is more than a very small placeholder
- you are fetching data from `useEffect`, `useSWR`-style hooks, or custom fetch utilities

## 4. When to choose which pattern

| Situation | Recommended pattern | Why |
|---|---|---|
| Page/segment loading for route navigation | `loading.tsx` | Built-in App Router support and stable page skeletons |
| Code-split or lazy component loading | `React.Suspense` | easiest fallback for dynamic imports and lazy children |
| API fetch result / retry-required route content | manual state | explicit control over loading, error, empty, and retry flows |
| simple component-level placeholder inside a client render | `Suspense` | avoids extra state when only a visual fallback is needed |

## 5. Practical rules for RemitWise

- Prefer route skeleta for page loading and navigation.
- Prefer manual state for data fetches that result in visible errors or retries.
- Prefer `Suspense` for client-side dynamic imports and lazy-loaded component boundaries.
- Do not wrap entire data-fetching pages in `Suspense` unless the fetch is already handled by a server component or route loader.

## Related docs

- [Component states guide](./COMPONENT_STATES.md)
- [Route loading and layout guidance](./LOAD_TIME_BUDGETS.md)
