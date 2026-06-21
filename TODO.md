# Task progress tracker

## Dashboard widget render smoke tests (Vitest + RTL)

### Step 0: Repo analysis

- [x] Identified target widgets/charts in `components/Dashboard/*` and `components/Insights/*`
- [x] Checked widget empty/error state components (`components/ui/WidgetEmptyState.tsx`, `WidgetErrorState.tsx`)
- [x] Checked provider dependency (`lib/context/DensityContext.tsx` throws if missing)

### Step 1: Test infra

- [ ] Extend Vitest config for jsdom+RTL tests (new test include glob)
- [ ] Add global RTL setup with jsdom + @testing-library/jest-dom
- [ ] Add small `renderWithProviders` helper (DensityProvider, etc.)

### Step 2: Smoke tests

- [ ] MoneyDistributionWidget: mounts + empty/error state
- [ ] SixMonthTrendsWidget: mounts + empty/error state (if supported; otherwise mount only)
- [ ] RecentTransactionsWidget: mounts + empty/error state (DensityProvider required)
- [ ] SavingsByGoalWidget: mounts + empty/error state
- [ ] QuickActions: mounts only (no widget empty/error)
- [ ] Insights charts: include RemittanceTrendChart, CategoryDonutChart, SpendingVsSavingChart + mount assertions
- [ ] Use `assert.doesNotThrow` pattern per requirement

### Step 3: Quality gates

- [x] Run `npm run test:coverage`
- [ ] Run `npx tsc --noEmit`
- [ ] Run `npm run lint`
