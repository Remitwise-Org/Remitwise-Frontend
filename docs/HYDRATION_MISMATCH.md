# Hydration Mismatch Guide

> **Audience:** contributors adding new UI components or pages to RemitWise Frontend.

A hydration mismatch happens when the HTML the server renders differs from what React
produces on the client during the initial mount. React logs a warning in development and
silently resets to the client tree in production, which can cause layout flashes, lost
interactivity, or double-render bugs.

This guide covers the patterns that come up most often in this codebase, why they happen,
and the canonical fix for each one.

---

## Table of Contents

1. [What causes hydration mismatches?](#what-causes-hydration-mismatches)
2. [Pattern 1 — Reading from browser APIs during render](#pattern-1--reading-from-browser-apis-during-render)
3. [Pattern 2 — Charts and canvas components](#pattern-2--charts-and-canvas-components)
4. [Pattern 3 — `localStorage` / `sessionStorage` on first render](#pattern-3--localstorage--sessionstorage-on-first-render)
5. [Pattern 4 — Dates and locale-sensitive formatting](#pattern-4--dates-and-locale-sensitive-formatting)
6. [Pattern 5 — `useSearchParams` and other router state](#pattern-5--usesearchparams-and-other-router-state)
7. [Debugging checklist](#debugging-checklist)
8. [What not to do](#what-not-to-do)

---

## What causes hydration mismatches?

Next.js 14 (App Router) server-renders every page by default. The server produces HTML
that travels to the browser; React then "hydrates" it by attaching event handlers and
reconciling the server tree with a fresh client render. If those two renders produce
different output, React throws the mismatch error:

```
Error: Hydration failed because the initial UI does not match what was rendered on the server.
```

Common root causes in this project:

| Root cause | Example |
|---|---|
| Reading `window` / `document` during render | Checking `window.history.length` to decide whether to show a Back button |
| Browser-only libraries | Chart.js, canvas APIs, Recharts |
| Storage access (`localStorage`, `sessionStorage`) | Bills page cache read |
| Locale/time-zone differences | Formatting a `Date` on the server vs. the user's browser |
| Router state (`useSearchParams`) | Reading query params outside a `<Suspense>` boundary |

---

## Pattern 1 — Reading from browser APIs during render

**Problem**

```tsx
// ❌ — `window` is undefined on the server; value differs between server and client
export default function SettingsHeader() {
  const canGoBack = window.history.length > 1; // throws on server
  return canGoBack ? <BackButton /> : null;
}
```

**Fix — defer to `useEffect`**

Move the browser API read into `useEffect`, which only runs on the client.
Start with a server-safe default that matches what the server renders.

```tsx
// ✅ — components/SettingsHeader.tsx (real pattern in this repo)
"use client";

import { useState, useEffect } from "react";

export default function SettingsHeader() {
  const [canGoBack, setCanGoBack] = useState(false); // server renders false

  useEffect(() => {
    setCanGoBack(window.history.length > 1); // client updates after mount
  }, []);

  return canGoBack ? <BackButton /> : null;
}
```

The server renders `null`; after hydration the client reads `window.history` and, if
needed, triggers a re-render. Because the first client render also produces `null` (the
initial state), the trees match and there is no mismatch.

**Guard pattern for utility functions**

Functions called during render that touch the DOM must guard against SSR:

```tsx
// ✅ — used in app/bills/page.tsx for the sessionStorage cache
function readBillsCache(): BillsCacheEnvelope | null {
  if (typeof window === "undefined") return null; // server: return safe default
  try {
    const raw = sessionStorage.getItem(BILLS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as BillsCacheEnvelope) : null;
  } catch {
    return null;
  }
}
```

---

## Pattern 2 — Charts and canvas components

**Problem**

Recharts, Chart.js, and similar libraries read `window` or `document` at import time or
during render. The server produces an empty container; the client renders the chart.
React sees two different trees.

**Fix — `dynamic()` with `{ ssr: false }`**

Wrap any browser-only component in Next.js's `dynamic()` loader. This tells Next.js to
skip SSR for the component entirely, so both server and client render the same
`<Suspense>` fallback until the component mounts.

```tsx
// ✅ — app/financial-insights/page.tsx (real pattern in this repo)
"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { SkeletonChart } from "@/components/ui/Skeleton";

const SpendingVsSavingsChart = dynamic(
  () =>
    import("@/components/Insights/spendingVsSavingChart").then((m) => ({
      default: m.SpendingVsSavingsChart,
    })),
  { ssr: false },
);

export default function FinancialInsightsPage() {
  return (
    <Suspense fallback={<SkeletonChart />}>
      <SpendingVsSavingsChart />
    </Suspense>
  );
}
```

The `Suspense` boundary gives the chart a stable layout placeholder (a skeleton) that
renders the same on server and client, so there is no visual flash.

Use `SkeletonChart` (or the appropriate skeleton from `components/ui/Skeleton.tsx`) as
the fallback. See [docs/component-states.md](component-states.md) for the full skeleton
catalogue.

---

## Pattern 3 — `localStorage` / `sessionStorage` on first render

**Problem**

Reading storage during render is the same category as Pattern 1, but comes up often
enough to call out separately. `sessionStorage` is undefined during SSR and may also be
unavailable in private-browsing environments.

**Fix**

Never read storage outside of `useEffect` or a function guarded by
`typeof window !== "undefined"`.

```tsx
// ❌ — reads storage during render; crashes on server
const cached = sessionStorage.getItem("bills-data");

// ✅ — safe guard (from app/bills/page.tsx)
function readBillsCache() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(sessionStorage.getItem("bills-data") ?? "null");
  } catch {
    return null; // quota exceeded or private browsing
  }
}
```

And always handle write failures silently:

```tsx
// ✅ — app/bills/page.tsx
function writeBillsCache(data: BillsCacheEnvelope): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("bills-data", JSON.stringify(data));
  } catch {
    // Quota exceeded or private browsing — degrade silently.
  }
}
```

---

## Pattern 4 — Dates and locale-sensitive formatting

**Problem**

The server may run in UTC; the user's browser runs in their local time zone. Formatting a
`Date` with `toLocaleDateString()` during render produces different strings on each side.

```tsx
// ❌ — server (UTC) and browser (e.g. America/New_York) produce different strings
<span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
```

**Fix — defer formatting to the client, or pin to UTC**

Option A — defer to `useEffect`:

```tsx
// ✅
export function FormattedDate({ iso }: { iso: string }) {
  const [label, setLabel] = useState(""); // server renders empty

  useEffect(() => {
    setLabel(new Date(iso).toLocaleDateString());
  }, [iso]);

  return <span>{label}</span>;
}
```

Option B — use `suppressHydrationWarning` when the mismatch is intentional and cosmetic
(the displayed value is correct on both sides, but differs by a small amount like a
relative timestamp):

```tsx
// ✅ — acceptable when the value is cosmetic and corrects itself after mount
<time dateTime={iso} suppressHydrationWarning>
  {new Date(iso).toLocaleDateString()}
</time>
```

`suppressHydrationWarning` silences the React warning for that element only. Do not use
it to mask logic bugs — only use it when you understand why the values differ and are
confident the client value is correct.

---

## Pattern 5 — `useSearchParams` and other router state

**Problem**

Next.js requires components that call `useSearchParams()` to be wrapped in a `<Suspense>`
boundary. Without the boundary, the entire route opts out of static rendering and you may
see mismatches or a build error.

```tsx
// ❌ — useSearchParams used without Suspense
export default function MyPage() {
  const params = useSearchParams(); // Next.js build warning / mismatch
  ...
}
```

**Fix — wrap in `<Suspense>` at the usage site**

Split the component that reads search params into an inner component and wrap it:

```tsx
// ✅ — pattern used by DevRequestIdDisplay in components/DevRequestIdDisplay.tsx
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function Inner() {
  const params = useSearchParams();
  const mode = params.get("mode");
  return <span>{mode}</span>;
}

export default function MyComponent() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
```

The `Suspense` boundary tells Next.js to stream the shell first and hydrate the inner
component asynchronously, keeping the server and client trees aligned.

---

## Debugging checklist

When you see a hydration mismatch warning in the browser console or failing Playwright
tests, work through this list:

1. **Read the full warning.** React prints which attribute or text node differed and where
   in the tree. The first differing node is usually the actual bug.

2. **Search for `window`, `document`, `navigator`, `localStorage`, `sessionStorage` in
   the component.** Any of these accessed outside `useEffect` is the likely culprit.

3. **Check for `new Date()` or locale formatters.** These produce different output on
   server and client if not pinned to a time zone.

4. **Look for browser-only libraries.** If a library imports from a module that accesses
   `window` at the top level, wrap the consumer with `dynamic(..., { ssr: false })`.

5. **Look for missing `<Suspense>` around `useSearchParams`.** The Next.js compiler will
   also emit a build warning for this.

6. **Try adding `suppressHydrationWarning` as a last resort.** Only after confirming the
   value is correct on the client and the difference is expected and cosmetic.

---

## What not to do

- **Do not call `window` / `document` during render without a guard.** Even in `"use client"`
  components, the initial render may occur on the server during SSR.

- **Do not rely on the absence of a hydration error in development to confirm correctness.**
  React suppresses some warnings in production or when `suppressHydrationWarning` is set
  on a parent. Run `npm run build && npm start` and inspect the page in a browser with
  React DevTools to catch issues that development mode silences.

- **Do not use `suppressHydrationWarning` on container elements.** It only suppresses
  warnings for the element's own attributes and text, not its subtree. If mismatches
  bubble up from children, fix the children.

- **Do not skip the `<Suspense>` fallback.** An empty `fallback={null}` is fine when
  nothing needs to show during load, but always include the boundary itself.

---

## Related docs

- [docs/component-states.md](component-states.md) — skeleton and loading state patterns
- [docs/architecture.md](architecture.md) — App Router route map and library layers
- [docs/CACHE_STRATEGY.md](CACHE_STRATEGY.md) — client-side caching with `sessionStorage`
- [docs/testing.md](testing.md) — Vitest and Playwright test setup
