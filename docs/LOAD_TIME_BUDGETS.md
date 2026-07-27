# Per-Route Load-Time Budgets

**Audience:** Contributors (frontend developers) and Operators

This document defines the performance budgets for every page route in RemitWise, explains how they are measured and enforced, and provides guidance for adding budgets when new routes are introduced.

For interactive frame budgets (scroll, click, animation handlers) see [frame-budget-rules.md](./frame-budget-rules.md). For the request gateway, rate limiting, and structured logging see [infrastructure.md](./infrastructure.md).

---

## Table of Contents

1. [Why per-route budgets?](#why-per-route-budgets)
2. [Route tiers and budgets](#route-tiers-and-budgets)
3. [Budget definitions](#budget-definitions)
4. [Current route map with budgets](#current-route-map-with-budgets)
5. [Measurement](#measurement)
6. [Enforcement](#enforcement)
7. [Adding a budget for a new route](#adding-a-budget-for-a-new-route)
8. [Exceeding a budget](#exceeding-a-budget)
9. [CI integration](#ci-integration)

---

## Why per-route budgets?

Not every page has the same complexity or user expectation. A landing page must be fast because it is the first impression. A dashboard aggregates data from multiple contracts and is allowed more time. An admin page is rarely visited and can tolerate a heavier payload. Per-route budgets let us:

- Catch regressions early (before they ship).
- Prioritise optimisation work where users feel it most.
- Give contributors clear, verifiable targets instead of vague "make it fast" guidance.

---

## Route tiers and budgets

Every route is assigned to one of four tiers. The tier determines the **Lighthouse performance score floor** and the **largest contentful paint (LCP) ceiling** used during CI audits.

| Tier | Lighthouse score floor | LCP ceiling | Description |
|------|----------------------|-------------|-------------|
| **1 — Critical** | ≥ 90 | ≤ 2.5 s | Landing, dashboard, send money. First impression or core transaction. |
| **2 — Feature** | ≥ 80 | ≤ 3.0 s | Authenticated feature pages (bills, split, insurance, family, goals, insights, transactions). |
| **3 — Utility** | ≥ 70 | ≤ 4.0 s | Settings, search, tutorials, receipts. Used less frequently or on-demand. |
| **4 — Admin** | ≥ 60 | ≤ 5.0 s | Debug, admin, API docs. Internal-only, not user-facing. |

### Why these numbers?

- **Tier 1** mirrors the existing Lighthouse test (`tests/e2e/dashboard-performance.spec.ts`) which asserts a score ≥ 90 for `/dashboard`. The 2.5 s LCP aligns with Google's "good" threshold for Core Web Vitals.
- **Tier 2** allows slightly more time because these pages load authenticated data from contracts, cache layers, and multiple API calls. A score of 80 still feels fast to users.
- **Tier 3** pages are accessed on-demand; users navigate to them with intent and accept a brief wait.
- **Tier 4** pages are internal tooling. Performance is still tracked to prevent bloat, but the bar is lower.

---

## Budget definitions

Each route has four measurable budget components:

| Component | What it measures | How it is checked |
|-----------|-----------------|-------------------|
| **Lighthouse performance score** | Overall performance grade (0–100) | Lighthouse audit in Playwright E2E test |
| **LCP (Largest Contentful Paint)** | Time until the largest visible element renders | Lighthouse audit (reported in `lhr.audits`) |
| **Route handler duration** | Server-side time to generate the response | Middleware `durationMs` logged per request; available at `GET /api/metrics` |
| **Bundle size** | JavaScript payload delivered to the browser | Build-time check (see [CI integration](#ci-integration)) |

### Route handler duration budgets

These are the server-side budgets for the middleware `durationMs` metric. They complement the Lighthouse numbers by capturing backend latency independently of network conditions.

| Tier | Route handler duration ceiling |
|------|-------------------------------|
| 1 — Critical | ≤ 200 ms |
| 2 — Feature | ≤ 500 ms |
| 3 — Utility | ≤ 1 000 ms |
| 4 — Admin | ≤ 2 000 ms |

> **Note:** These budgets apply to the route handler execution time (the `durationMs` logged by `middleware.ts`), not total page load time. They ensure the server responds quickly; client-side rendering accounts for the rest of the user-visible load.

---

## Current route map with budgets

| Route | Tier | Lighthouse floor | LCP ceiling | Handler ceiling |
|-------|------|-----------------|-------------|-----------------|
| `/` | 1 | 90 | 2.5 s | 200 ms |
| `/dashboard` | 1 | 90 | 2.5 s | 200 ms |
| `/send` | 1 | 90 | 2.5 s | 200 ms |
| `/split` | 2 | 80 | 3.0 s | 500 ms |
| `/bills` | 2 | 80 | 3.0 s | 500 ms |
| `/insurance` | 2 | 80 | 3.0 s | 500 ms |
| `/family` | 2 | 80 | 3.0 s | 500 ms |
| `/dashboard/goals` | 2 | 80 | 3.0 s | 500 ms |
| `/dashboard/insight` | 2 | 80 | 3.0 s | 500 ms |
| `/dashboard/transaction-history` | 2 | 80 | 3.0 s | 500 ms |
| `/transactions` | 2 | 80 | 3.0 s | 500 ms |
| `/financial-insights` | 2 | 80 | 3.0 s | 500 ms |
| `/emergency-transfer` | 2 | 80 | 3.0 s | 500 ms |
| `/settings` | 3 | 70 | 4.0 s | 1 000 ms |
| `/search` | 3 | 70 | 4.0 s | 1 000 ms |
| `/tutorial` | 3 | 70 | 4.0 s | 1 000 ms |
| `/tutorial/[tutorialId]` | 3 | 70 | 4.0 s | 1 000 ms |
| `/tutorial/[tutorialId]/chapter/[chapterId]` | 3 | 70 | 4.0 s | 1 000 ms |
| `/receipt/[txHash]` | 3 | 70 | 4.0 s | 1 000 ms |
| `/debug` | 4 | 60 | 5.0 s | 2 000 ms |
| `/admin` | 4 | 60 | 5.0 s | 2 000 ms |
| `/api/docs` | 4 | 60 | 5.0 s | 2 000 ms |

---

## Measurement

### Lighthouse audits (client-side)

Lighthouse runs headless Chrome against each route and produces a performance score (0–100) plus individual audit results including LCP, FID/INP, CLS, FCP, and TBT.

The existing E2E test (`tests/e2e/dashboard-performance.spec.ts`) demonstrates the pattern:

```ts
import { assertDashboardPerformanceBudget } from '@/lib/performance/lighthouse-budget';

const result = await lighthouse(url, {
  chromePath: chromium.executablePath(),
  chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
  output: 'json',
  onlyCategories: ['performance'],
  extraHeaders: {
    'x-playwright-test': 'true',
    Cookie: cookieValue,
  },
});

const score = result.lhr.categories.performance.score ?? 0;
expect(assertDashboardPerformanceBudget(score)).toBeGreaterThanOrEqual(90);
```

The helper `assertDashboardPerformanceBudget` in `lib/performance/lighthouse-budget.ts` normalises the 0–1 score to 0–100 and throws if it falls below the threshold. For other tiers, use `normalizeLighthouseScore` directly with the appropriate threshold:

```ts
import { normalizeLighthouseScore, PERFORMANCE_BUDGET_THRESHOLD } from '@/lib/performance/lighthouse-budget';

const normalized = normalizeLighthouseScore(score);
if (normalized < 80) {
  throw new Error(`Feature page Lighthouse score ${normalized} is below 80.`);
}
```

### Middleware duration logging (server-side)

Every API request is timed by `middleware.ts` and logged as structured JSON with a `durationMs` field. See [metrics-logging.md](./metrics-logging.md) for the log format.

In-memory counters are also exposed at `GET /api/metrics` (admin only). Operators can poll this endpoint or feed the structured logs into an aggregator (Datadog, Grafana, CloudWatch) to track p50/p95/p99 latencies per route.

### Sentry performance tracing

Sentry traces are captured at 10% in production (client) and 5% (edge). When tracing is sampled, Sentry records transaction durations and reports them in the Performance dashboard. Use the Sentry transaction name (typically the route path) to filter by route.

> **Note:** Sentry sampling means 90% of production traces are dropped. Do not rely on Sentry alone for budget enforcement; use the Lighthouse E2E tests as the primary gate.

---

## Enforcement

Enforcement happens at three layers:

### 1. CI gate (Lighthouse E2E)

The Lighthouse E2E test runs on every PR that touches page components or layout files. It asserts the Lighthouse performance score against the tier's floor. This is the **primary enforcement mechanism** for client-side load-time budgets.

To run it locally:

```bash
npm run test:perf
```

This executes `tests/e2e/dashboard-performance.spec.ts`. To add similar tests for other routes, copy the pattern and adjust the URL and threshold.

### 2. Build-time bundle size check

The `npm run build` step produces a production bundle. While there is no automated size-limit gate yet, contributors should review the build output for unexpected bundle size increases. If a route's JavaScript chunk grows by more than 10% after a change, investigate and optimise before merging. Use `@next/bundle-analyzer` to analyze and inspect chunk details (see the [Bundle Analysis Guide](./BUNDLE_ANALYSIS.md) for usage instructions).

Future enhancement: integrate `size-limit` or automate budget checks in CI.

### 3. Runtime monitoring (operators)

Operators should monitor the structured logs for `durationMs` values exceeding the route handler ceiling. A simple alert rule:

```yaml
# Example Datadog/Grafana alert
- alert: SlowRouteHandler
  expr: durationMs > 500
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Route {{ $labels.path }} handler taking > 500ms (p95)"
```

---

## Adding a budget for a new route

When you create a new page route:

1. **Assign a tier** based on the route's user impact (see [Route tiers and budgets](#route-tiers-and-budgets)). Use your judgement; when in doubt, pick the more conservative (lower-numbered) tier.

2. **Add the route to the table** in [Current route map with budgets](#current-route-map-with-budgets) and to this document.

3. **Write a Lighthouse E2E test** if the route is Tier 1 or Tier 2. Copy the pattern from `tests/e2e/dashboard-performance.spec.ts`:
   - Authenticate (nonce → sign → login).
   - Run Lighthouse against the route URL.
   - Assert the score against the tier's floor using `normalizeLighthouseScore` or a dedicated helper.

4. **Add a performance budget helper** (optional) in `lib/performance/` if the route has specific constraints beyond the generic tier budgets.

5. **Verify** that the route's `loading.tsx` skeleton provides stable layout blocks (see [component-states.md](./component-states.md)).

---

## Exceeding a budget

If a Lighthouse audit or runtime metric exceeds its budget:

1. **Identify the bottleneck.** Use Chrome DevTools Performance tab to record a load session. Look for long tasks (> 50 ms) on the main thread.
2. **Check common culprits:**
   - Large unoptimised images (use `next/image`).
   - Unnecessary client-side JavaScript (use `next/dynamic` with `ssr: false` for heavy components).
   - Waterfalling API calls (parallelise with `Promise.all` or use the dashboard aggregate pattern).
   - Missing `loading.tsx` (users see a blank screen during server render).
3. **Fix and re-audit.** Run `npm run test:perf` (or the equivalent test for your route) to confirm the budget is met.
4. **Document any intentional overrides.** If a route genuinely needs to exceed its tier budget (e.g. a data-heavy insight page), add a comment in the E2E test and update this document with the new threshold and rationale.

---

## CI integration

### Current state

| Check | Command | Enforced in CI |
|-------|---------|---------------|
| Lighthouse score (dashboard) | `npm run test:perf` | Yes — blocks merge on failure |
| Unit tests | `npm run test:unit` | Yes |
| Integration tests | `npm run test:integration` | Yes |
| E2E tests | `npm run test:e2e` | Yes |
| Build | `npm run build` | Yes |
| Lint | `npm run lint` | Yes |

### Adding more Lighthouse E2E tests

To enforce budgets for additional routes, add new test files under `tests/e2e/` following the dashboard performance test pattern. Each test should:

1. Authenticate using the nonce → sign → login flow.
2. Run `lighthouse()` against the route URL.
3. Assert the score with the appropriate tier threshold.

Register the new test in the `test:perf` script in `package.json`:

```json
"test:perf": "npx playwright test tests/e2e/dashboard-performance.spec.ts tests/e2e/your-route-performance.spec.ts"
```

### Future enhancements (out of scope)

- Automated `size-limit` integration for per-chunk JavaScript budgets.
- Lighthouse CI server for tracking score trends over time.
- Sentry performance alerting tied to the tier handler ceilings.

---

## Cross-references

| Document | Relevance |
|----------|-----------|
| [BUNDLE_ANALYSIS.md](./BUNDLE_ANALYSIS.md) | How to run and interpret bundle size analyses |
| [frame-budget-rules.md](./frame-budget-rules.md) | Interactive handler budgets (scroll ≤ 16 ms, click ≤ 100 ms) |
| [metrics-logging.md](./metrics-logging.md) | Structured JSON log format and `durationMs` field |
| [infrastructure.md](./infrastructure.md) | Request gateway, rate limiting, and middleware flow |
| [architecture.md](./architecture.md) | Full route map and library layers |
| [component-states.md](./component-states.md) | Loading skeleton patterns for stable layout |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Test commands and PR expectations |

---

**Last Updated:** 2026-07-24