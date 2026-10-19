# Performance Tracing: Chrome Trace Capture and Analysis

**Audience:** Contributors (frontend developers)

This guide explains how to capture a Chrome performance trace for any RemitWise page, load it into DevTools, and read the output well enough to identify and fix regressions. It focuses on the traces you will need day-to-day: navigations, user interactions, and network waterfalls.

For **per-route score floors and LCP ceilings** see [docs/LOAD_TIME_BUDGETS.md](./LOAD_TIME_BUDGETS.md).
For **frame budget limits** (scroll, click, animation ≤ 16 ms / 100 ms) see [docs/frame-budget-rules.md](./frame-budget-rules.md).

---

## Table of Contents

1. [When to reach for a trace](#1-when-to-reach-for-a-trace)
2. [Setup: browser and dev server](#2-setup-browser-and-dev-server)
3. [Capturing a trace in Chrome DevTools](#3-capturing-a-trace-in-chrome-devtools)
4. [Capturing a trace with Playwright](#4-capturing-a-trace-with-playwright)
5. [Reading the flame chart](#5-reading-the-flame-chart)
6. [Key metrics and where to find them](#6-key-metrics-and-where-to-find-them)
7. [Common problems and how to spot them](#7-common-problems-and-how-to-spot-them)
8. [Using `performance.mark` and `performance.measure`](#8-using-performancemark-and-performancemeasure)
9. [Sharing a trace with the team](#9-sharing-a-trace-with-the-team)
10. [Related docs](#10-related-docs)

---

## 1. When to reach for a trace

Reach for a trace when:

- A Lighthouse CI job fails the dashboard score floor (≥ 90) or a feature-page floor (≥ 80).
- A `tests/e2e/dashboard-performance.spec.ts` run reports a score below the `PERFORMANCE_BUDGET_THRESHOLD` constant in `lib/performance/lighthouse-budget.ts`.
- An interaction feels sluggish locally but you cannot see why from logs alone.
- You are adding a new data-heavy component to `/dashboard` or `/send` and want to verify it stays within tier-1 budgets.

Traces are overkill for straightforward logic bugs. Use them for rendering or loading regressions.

---

## 2. Setup: browser and dev server

### Use a fresh browser profile

Tracing in your main profile pollutes results with extensions and cached state.

```bash
# macOS — open a clean Chrome instance
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir=/tmp/remitwise-trace-profile \
  --disable-extensions \
  http://localhost:3000/dashboard
```

```bash
# Linux
google-chrome \
  --user-data-dir=/tmp/remitwise-trace-profile \
  --disable-extensions \
  http://localhost:3000/dashboard
```

### Start the dev server

```bash
npm run dev
```

For a production-like trace (no Fast Refresh overhead, minified bundles) use:

```bash
npm run build && npm start
```

Production builds reflect what CI Lighthouse audits measure and are the right baseline when chasing a budget failure.

---

## 3. Capturing a trace in Chrome DevTools

### Record a navigation trace

1. Open **Chrome DevTools** (`F12` or `Cmd+Option+I`).
2. Go to the **Performance** tab.
3. Check **Screenshots** and **Web Vitals** in the toolbar.
4. Click ⏺ **Record** (or press `Ctrl+Shift+E`).
5. In the address bar, navigate to the page you want to profile, e.g. `http://localhost:3000/dashboard`.
6. Wait until the page is fully loaded and interactive.
7. Click ⏹ **Stop**.

DevTools processes the trace and shows the flame chart automatically.

### Record an interaction trace

Use this when you want to measure a button click, a scroll, or a modal open — not a full page load.

1. Navigate to the page first and let it finish loading.
2. Go to the **Performance** tab.
3. Click ⏺ **Record**.
4. Perform the interaction (e.g. click **Send Money**, open the command palette with `Cmd+K`).
5. Click ⏹ **Stop** within 2–3 seconds. Shorter recordings are easier to read.

### Save and reload a trace

```
DevTools → Performance → ⬇ Save profile   (saves a .json file)
DevTools → Performance → ⬆ Load profile   (load a saved .json file)
```

Saved `.json` traces can be shared via PR comments or attached to issues.

---

## 4. Capturing a trace with Playwright

The `npm run test:perf` script already runs the existing Lighthouse E2E test. For a raw Chrome trace you can add a short Playwright helper alongside it:

```typescript
// tests/e2e/trace-dashboard.ts
// Run with: npx playwright test tests/e2e/trace-dashboard.ts
import { test } from "@playwright/test";
import path from "path";

test("capture dashboard trace", async ({ page, context }) => {
  // Start tracing — screenshots and snapshots help with analysis
  await context.tracing.start({ screenshots: true, snapshots: true });

  await page.goto("http://localhost:3000/dashboard");

  // Wait for the primary content panel to appear
  await page.waitForSelector('[data-testid="dashboard-summary"]', {
    timeout: 10_000,
  });

  // Stop and save the trace
  const tracePath = path.join(
    process.cwd(),
    "test-results",
    "dashboard-trace.zip",
  );
  await context.tracing.stop({ path: tracePath });

  console.log(`Trace saved to ${tracePath}`);
});
```

Open the resulting `test-results/dashboard-trace.zip` in `https://trace.playwright.dev` to view it in a dedicated UI, or extract the `.json` inside and load it into Chrome DevTools → Performance → Load profile.

---

## 5. Reading the flame chart

When you stop a recording, DevTools shows four main sections:

```
┌──────────────────────────────────────────────────────────────┐
│  Summary bar  │ FPS, CPU, NET mini-charts (zoom target here) │
├──────────────────────────────────────────────────────────────┤
│  Timings row  │ FP, FCP, LCP, TTI markers                    │
├──────────────────────────────────────────────────────────────┤
│  Main thread  │ Flame chart — this is where you spend time   │
├──────────────────────────────────────────────────────────────┤
│  Bottom panel │ Summary / Call tree / Event log              │
└──────────────────────────────────────────────────────────────┘
```

**Zooming:** click-drag on the summary bar at the top to zoom into a time range.

**Colours in the flame chart:**

| Colour | Meaning |
|--------|---------|
| Yellow | Scripting (JS execution) |
| Purple | Rendering (style, layout) |
| Green  | Painting |
| Grey   | Idle / system |
| Red    | Long task (> 50 ms) — always investigate these |

**How to read a call stack:** the widest bar at the top of a call stack is the root caller. Narrower bars below it are callees. A tall, wide yellow bar is a JS function doing a lot of work — click it to see the source location in the **Summary** panel.

---

## 6. Key metrics and where to find them

### Core Web Vitals in the Timings row

| Marker | Full name | Tier-1 target | Where in DevTools |
|--------|-----------|---------------|-------------------|
| FCP    | First Contentful Paint | ≤ 1.8 s | Timings row, blue flag |
| LCP    | Largest Contentful Paint | ≤ 2.5 s | Timings row, green flag |
| TTI    | Time to Interactive | ≤ 3.5 s | Timings row, orange flag |
| TBT    | Total Blocking Time | ≤ 200 ms | Summary panel (sum of long tasks > 50 ms) |

> Tier-1 targets apply to `/`, `/dashboard`, and `/send`. See [LOAD_TIME_BUDGETS.md](./LOAD_TIME_BUDGETS.md) for other tiers.

### Network waterfall

Switch to the **Network** panel and tick **Disable cache** (while DevTools is open). Reload the page. The waterfall shows:

- **TTFB** (Time to First Byte): the grey bar before the blue response bar. Over ~600 ms on localhost usually means a slow API route or unoptimised database query.
- **Transfer size**: look for bundles over 100 kB uncompressed on the critical path.

### Long tasks

Any task ≥ 50 ms is highlighted red in the **Main** thread lane. The **Bottom-up** tab in the bottom panel sorts function calls by **Self time** — functions at the top of that list own the most CPU.

---

## 7. Common problems and how to spot them

### Large bundle blocking the main thread

**Symptom:** a wide red bar at the start of the trace, before FCP.

**How to check:** zoom into the red bar → click it → the Summary panel shows `Evaluate Script` with the bundle filename.

**Fix:** check `next build` output for chunk sizes. Use `next/dynamic` with `{ ssr: false }` to defer heavy client components:

```tsx
// Before — imported at module level, blocks hydration
import { HeavyChart } from "@/components/HeavyChart";

// After — loaded only when the component is about to render
import dynamic from "next/dynamic";
const HeavyChart = dynamic(() => import("@/components/HeavyChart"), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse bg-[var(--skeleton-bg-start)]" />,
});
```

### Waterfall stall waiting for an API route

**Symptom:** a long TTFB bar on a `/api/*` request inside the trace.

**How to check:** Network panel → click the `/api/split` (or similar) request → **Timing** tab → large **Waiting (TTFB)** value.

**Fix:** check whether the route is hitting the database without the in-memory cache. See [docs/contract-cache.md](./contract-cache.md) and [docs/CACHE_STRATEGY.md](./CACHE_STRATEGY.md) for the caching layers available.

### React re-render storm

**Symptom:** a repeating pattern of yellow `Re-render` bars after an interaction, each ≥ 16 ms.

**How to check:** zoom into the interaction → look for multiple stacked `commitRoot` calls in the **Main** lane within a short window.

**Fix:** add `React.memo`, `useMemo`, or `useCallback` to the component that triggers the cascade. Confirm with the built-in React DevTools **Profiler** tab (separate from the Performance tab).

### Layout thrash

**Symptom:** alternating purple **Recalculate Style** and **Layout** bars.

**How to check:** click one of the purple bars → Summary panel shows the JavaScript line that triggered the forced reflow (e.g. reading `.offsetHeight` inside a loop).

**Fix:** batch DOM reads before DOM writes. Never read a layout property inside a loop that also writes style.

---

## 8. Using `performance.mark` and `performance.measure`

For deep investigation of a specific code path, instrument it directly:

```typescript
// lib/performance/tracing.ts
/**
 * Wraps an async operation with User Timing marks visible in the
 * DevTools Performance flame chart under the "Timings" lane.
 *
 * Usage:
 *   const data = await traceAsync("fetch-split-config", () => fetchSplitConfig());
 */
export async function traceAsync<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  performance.mark(`${label}:start`);
  try {
    return await fn();
  } finally {
    performance.mark(`${label}:end`);
    performance.measure(label, `${label}:start`, `${label}:end`);
  }
}
```

Example in a page component:

```tsx
// app/dashboard/page.tsx (simplified)
import { traceAsync } from "@/lib/performance/tracing";

export default async function DashboardPage() {
  const split = await traceAsync("dashboard:fetch-split", () =>
    fetchSplitConfig(),
  );
  const goals = await traceAsync("dashboard:fetch-goals", () =>
    fetchGoals(),
  );

  return <DashboardContent split={split} goals={goals} />;
}
```

After recording a trace, the `dashboard:fetch-split` and `dashboard:fetch-goals` bars appear in the **Timings** lane of the flame chart, making it easy to see exactly how long each data-fetch took relative to the overall LCP.

---

## 9. Sharing a trace with the team

1. In DevTools → Performance → click **⬇ Save profile** to export a `.json` file (typically 1–20 MB).
2. Compress it: `gzip dashboard-trace.json` (reduces to ~10–20% of original size).
3. Attach the `.json.gz` to the PR or GitHub issue comment. Reviewers can load it via DevTools → Performance → **⬆ Load profile** without decompressing.

For Playwright traces (`.zip`) upload the file and share the link — it opens directly at `https://trace.playwright.dev`.

When sharing a trace, include:
- The URL and route that was profiled.
- Whether it was a dev or production build.
- The specific interaction or load that is being investigated.

---

## 10. Related docs

- [docs/LOAD_TIME_BUDGETS.md](./LOAD_TIME_BUDGETS.md) — per-route Lighthouse score floors, LCP ceilings, and how CI enforces them.
- [docs/frame-budget-rules.md](./frame-budget-rules.md) — 16 ms scroll / 100 ms click budgets with code examples.
- [docs/contract-cache.md](./contract-cache.md) — in-memory caching for contract calls; first stop when diagnosing slow TTFB on API routes.
- [docs/CACHE_STRATEGY.md](./CACHE_STRATEGY.md) — full caching architecture including HTTP caching and Next.js fetch cache.
- [docs/infrastructure.md](./infrastructure.md) — request gateway, rate limiting, and structured request logs.
- `lib/performance/lighthouse-budget.ts` — `PERFORMANCE_BUDGET_THRESHOLD` constant and `assertDashboardPerformanceBudget` utility used in E2E tests.
- `tests/e2e/dashboard-performance.spec.ts` — the CI Lighthouse audit for `/dashboard`.
