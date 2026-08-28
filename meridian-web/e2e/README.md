# End-to-End Tests (Playwright)

E2E coverage for the meridian-web sign-in / homepage flows, powered by
[Playwright](https://playwright.dev) with
[axe-core](https://github.com/dequelabs/axe-core) accessibility smoke checks
and visual-regression snapshots.

## What's covered

| Spec | Flows |
|---|---|
| `homepage.spec.ts` | Homepage load, hero content, header nav, anchor navigation |
| `theme-toggle.spec.ts` | Light/dark switching, localStorage persistence, keyboard access |
| `mobile-nav.spec.ts` | Hamburger open/close, `aria-expanded` state, nav + theme toggle on mobile (Pixel 7 viewport) |
| `sign-in.spec.ts` | Form validation (email/password/required), submit gating, auth redirect on success, error toasts on failure — **all API calls mocked** |
| `accessibility.spec.ts` | axe-core WCAG 2.0/2.1 A+AA smoke checks (zero serious/critical violations) on `/` and `/auth/sign-in`, form labelling |
| `dashboard.spec.ts` | Dashboard load, metric cards, charts, real-time updates, offline mode, responsive layout, keyboard navigation, performance budgets |
| `performance.spec.ts` | Core Web Vitals (CLS, LCP, TTFB, FCP), dashboard-specific metrics, animation FPS, long-task detection, budget compliance |
| `visual-regression.spec.ts` | Full-page screenshot snapshots for homepage, dashboard, sign-in, 404, and mobile menu — in light/dark mode at mobile (375px) and desktop (1440px) viewports |

### Component Tests (Vitest)

| Spec | Coverage |
|---|---|
| `components/sections/pool/__tests__/LeaderboardCard.test.tsx` | Leaderboard row rendering, proof status display |
| `components/sections/streams/__tests__/EarningsCalculator.test.tsx` | Salary input recompute, accessible table rendering |
| `components/sections/focus/__tests__/TimerSelector.test.tsx` | Duration selection, session start/cancel, timer display, loading spinner — all three state transitions |

## Running the tests

```bash
# one-time: install deps + the Chromium browser binary
pnpm install
npx playwright install chromium

# run the suite (builds the app and starts it on port 3100 automatically)
pnpm test            # alias for `playwright test`
npx playwright test  # equivalent

# interactive UI mode
pnpm test:e2e:ui

# a single spec / project
npx playwright test e2e/sign-in.spec.ts
npx playwright test --project=mobile-chromium

# update visual-regression baselines
npx playwright test --update-snapshots

# run component tests only
npx vitest run
```

## How it works

- **Production build under test.** The `webServer` block in
  `playwright.config.ts` runs `pnpm build && pnpm start -p 3100` before the
  suite and tears it down afterwards. Testing the production build avoids
  the flaky first-compile timeouts of dev mode. Locally the server is
  reused across runs (`reuseExistingServer`); in CI it's always fresh.
- **No backend required.** The sign-in flow's `POST /api/auth/signin` call
  is intercepted per-test with `page.route()` and fulfilled with canned
  200/401/500 responses, so tests are deterministic and hermetic.
- **Two projects.** `chromium` (Desktop Chrome) runs everything except
  `mobile-nav.spec.ts`, which runs in `mobile-chromium` (Pixel 7) where the
  hamburger menu is actually visible.
- **Accessibility bar.** The axe checks fail only on `serious`/`critical`
  WCAG A/AA violations — strict enough to catch regressions, lenient enough
  not to block on best-practice noise. Tighten by removing the impact
  filter in `accessibility.spec.ts`.
- **Visual snapshots.** Full-page screenshots are compared against approved
  baselines in `e2e/snapshots/`. Run with `--update-snapshots` to accept
  new or changed baselines. The `threshold: 0.02` setting tolerates minor
  anti-aliasing differences across platforms.

## CI notes

- `forbidOnly` fails the build if a stray `test.only` is committed.
- 2 retries and a single worker in CI (`process.env.CI`), with traces and
  an HTML report (`playwright-report/`) captured on retry/failure.
- The `.github/workflows/frontend-ci.yml` workflow runs lint, typecheck,
  unit tests, e2e tests, and a Lighthouse performance/a11y audit on every
  PR that touches `meridian-web/`.
- Artifacts (`test-results/`, `playwright-report/`) are gitignored.

## Visual-regression baselines

After adding or modifying visual-regression tests, commit the generated
snapshots from `e2e/snapshots/` alongside your code changes:

```bash
git add e2e/snapshots/
git commit -m "test(e2e): update visual-regression baselines"
```

**First-run behaviour:** When no baseline exists yet, Playwright will
**create** one automatically. Subsequent runs compare against it and fail
on visual diffs.
