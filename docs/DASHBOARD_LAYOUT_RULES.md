# Dashboard Layout Rules

This document is for **contributors** working on dashboard routes and widgets.
It records the layout intent behind the dashboard so reviewers can compare code
changes against a stable set of rules instead of inferring behavior from past
PRs.

## Scope

Use this document when editing:

- `app/dashboard/page.tsx`
- `app/dashboard/layout.tsx`
- `components/Dashboard/*`
- dashboard-specific loading states such as `app/dashboard/loading.tsx`

For broader page-shell conventions, see [LAYOUT_PATTERNS.md](./LAYOUT_PATTERNS.md).

## Entrypoints

The dashboard shell and landing page live here:

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WhatsNewProvider>
      <div className="min-h-screen overflow-x-hidden bg-bg3">
        <PrimaryNav />
        <SubNav />
        <main className="pt-32 375:pt-36">{children}</main>
        <WhatsNewPanel />
      </div>
    </WhatsNewProvider>
  );
}
```

```tsx
// app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI cards */}
      </div>
    </div>
  );
}
```

These files are the first places to verify when a change affects dashboard
spacing, stacking, or widget prominence.

## Information hierarchy

The dashboard should answer the user’s highest-value questions in this order:

1. **Am I financially OK right now?**
   - Primary KPI cards and health indicators go first.
2. **What should I do next?**
   - Quick actions and urgent follow-ups come next.
3. **What changed recently?**
   - Recent transactions and short-term trend widgets follow.
4. **How is my money distributed over time?**
   - Secondary analysis and comparative widgets come after the action-driving content.

If a widget does not help with one of those questions, it probably belongs lower
in the page or on a dedicated dashboard sub-route.

## Column ratios

Use a simple asymmetric layout once the page grows beyond stacked KPI cards.
The intended desktop reading pattern is a **primary content column plus a
secondary supporting column**.

### Desktop rule

- Prefer a **3:1** or **8:4 / 9:3** split for the main dashboard body.
- The wider column holds action-driving or dense widgets such as:
  - recent transactions
  - multi-point trend charts
  - goal progress lists
- The narrower column holds supporting widgets such as:
  - quick actions
  - summaries
  - small status or distribution widgets

A typical implementation is:

```tsx
<div className="grid gap-6 xl:grid-cols-12">
  <section className="xl:col-span-8 space-y-6">
    <RecentTransactionsWidget />
    <SixMonthTrendsWidget />
  </section>

  <aside className="xl:col-span-4 space-y-6">
    <QuickActions />
    <MoneyDistributionWidget />
  </aside>
</div>
```

### Tablet rule

- Collapse toward fewer columns before collapsing to one column.
- Prefer **2-up groups** for KPI cards and similarly weighted widgets.
- Avoid introducing a narrow sidebar that squeezes charts or transaction tables.

### KPI row rule

The current landing page uses:

```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
```

Keep KPI cards visually equal in the summary row unless there is a product-level
reason to promote one metric. Do not create one oversized KPI card just because
it has a longer label or more available data.

## Widget priority rules

Use these priorities when deciding order, prominence, and which widgets may move
below the fold.

### Priority 1 — must stay high on the page

- KPI summary cards
- urgent account state or blocking notices
- primary quick actions
- recent transactions when they are the main activity proof

### Priority 2 — important but can follow primary actions

- trend widgets such as `SixMonthTrendsWidget`
- savings progress widgets such as `SavingsByGoalWidget`
- distribution summaries such as `MoneyDistributionWidget`

### Priority 3 — supporting context

- educational or discovery UI
- "what's new" or release-adoption affordances
- lower-frequency summaries that do not change the next user action

If space is limited, demote Priority 3 widgets before compressing Priority 1
content into unreadable cards or charts.

## Mobile stacking

On mobile, widgets must stack in **priority order**, not desktop left-to-right
source order by accident.

### Rule of thumb

1. KPI summary row
2. primary action widget
3. most recent or most urgent activity widget
4. progress and trend widgets
5. supporting summaries
6. discovery or release-related panels

### Implementation guidance

- Keep DOM order aligned with mobile reading order whenever possible.
- Use CSS ordering only when necessary for a layout-specific exception.
- Avoid two-column mobile layouts inside dashboard widgets unless the content is
  trivially scannable.
- A widget that needs horizontal scrolling on mobile is usually in the wrong form.

Example stacked structure:

```tsx
<div className="space-y-6">
  <section aria-labelledby="dashboard-kpis">...</section>
  <section aria-labelledby="dashboard-actions">...</section>
  <section aria-labelledby="dashboard-recent-transactions">...</section>
  <section aria-labelledby="dashboard-progress">...</section>
  <section aria-labelledby="dashboard-trends">...</section>
</div>
```

## Loading and empty-state expectations

Dashboard layout stability matters as much as widget content.

- Preserve the final widget footprint during loading.
- Prefer route-level or widget-level skeletons over spinners.
- Keep empty states actionable.
- Keep error states retryable when the widget can recover independently.

The dashboard route already uses a route-level loading entrypoint:

```tsx
// app/dashboard/loading.tsx
import { DashboardLoadingSkeleton } from "@/components/ui/LoadingSkeletons";

export default function Loading() {
  return <DashboardLoadingSkeleton />;
}
```

Related widget smoke tests already cover the expected render surface for several
priority widgets:

- `components/Dashboard/dashboard-widgets-smoke.test.tsx`
- `components/Dashboard/MoneyDistributionWidget.test.tsx`
- `components/Dashboard/RecentTransactionsWidget.test.tsx`
- `components/Dashboard/SavingsByGoalWidget.test.tsx`
- `components/Dashboard/SixMonthTrendsWidget.test.tsx`

## Review checklist

When reviewing a dashboard layout change, verify:

- the most important user action still appears before supporting analysis
- desktop uses a clear primary/supporting column split when multiple columns are present
- KPI cards remain balanced in the summary row
- mobile stacks by priority instead of by incidental desktop placement
- loading, empty, and error states preserve the intended hierarchy
- spacing and backgrounds continue to use project tokens and existing Tailwind utilities

## Related docs

- [LAYOUT_PATTERNS.md](./LAYOUT_PATTERNS.md)
- [COMPONENTS.md](./COMPONENTS.md)
- [COMPONENT_STATES.md](./COMPONENT_STATES.md)
