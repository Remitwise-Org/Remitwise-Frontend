# Empty-State Illustrations

This document catalogs every empty state in RemitWise: which Lucide icon acts as the illustration, what copy is shown, and whether a call-to-action is present. Audience: **contributors** adding new views or changing existing ones.

---

## How empty states work

All feature-widget empty states use one of two components:

| Component | File | When to use |
|---|---|---|
| `WidgetEmptyState` (default export) | `components/ui/WidgetEmptyState.tsx` | Any widget or page that wants an icon, typed title, description, and an optional CTA link or action button. |
| `WidgetEmptyState` (named export from `WidgetStates`) | `components/ui/WidgetStates.tsx` | Legacy usage in the Bills section; renders with a fixed `AlertCircle` icon and no CTA. **Prefer the default export for new work.** |

The primary component renders a red circular icon badge, a bold title, a muted description, and an optional CTA:

```tsx
import WidgetEmptyState from '@/components/ui/WidgetEmptyState';
import { PiggyBank } from 'lucide-react';

<WidgetEmptyState
  icon={PiggyBank}
  title="No savings goals yet"
  description="Create a goal to start tracking your savings progress."
  ctaLabel="Create a goal"
  ctaHref="/goals"
/>
```

The icon prop accepts any `LucideIcon`. The red circle badge is always the same size (`h-12 w-12`); only the icon inside changes.

---

## Catalog

### Dashboard widgets

#### Recent Transactions (`components/Dashboard/RecentTransactionsWidget.tsx`)

| Property | Value |
|---|---|
| Icon | `ArrowLeftRight` |
| Title | "No transactions yet" |
| Description | "Send money to a recipient and your activity will appear here." |
| CTA | "Send money" → `/send` |

Shown when `transactions` prop is an empty array.

```tsx
<WidgetEmptyState
  icon={ArrowLeftRight}
  title="No transactions yet"
  description="Send money to a recipient and your activity will appear here."
  ctaLabel="Send money"
  ctaHref="/send"
/>
```

---

#### Savings by Goal (`components/Dashboard/SavingsByGoalWidget.tsx`)

| Property | Value |
|---|---|
| Icon | `PiggyBank` |
| Title | "No savings goals yet" |
| Description | "Create a goal to start tracking your savings progress." |
| CTA | "Create a goal" → `/goals` |

Shown when `goals` prop is an empty array.

```tsx
<WidgetEmptyState
  icon={PiggyBank}
  title="No savings goals yet"
  description="Create a goal to start tracking your savings progress."
  ctaLabel="Create a goal"
  ctaHref="/goals"
/>
```

---

#### Money Distribution (`components/Dashboard/MoneyDistributionWidget.tsx`)

| Property | Value |
|---|---|
| Icon | `PieChart` |
| Title | "No distribution data yet" |
| Description | "Set up your money split to see how your funds are allocated." |
| CTA | "Set up your split" → `/split` |

Shown when `distributionData` prop is an empty array.

```tsx
<WidgetEmptyState
  icon={PieChartIcon}
  title="No distribution data yet"
  description="Set up your money split to see how your funds are allocated."
  ctaLabel="Set up your split"
  ctaHref="/split"
/>
```

---

#### Six-Month Trends (`components/Dashboard/SixMonthTrendsWidget.tsx`)

| Property | Value |
|---|---|
| Icon | `TrendingUp` |
| Title | "No trends data yet" |
| Description | "Keep using Remitwise to see your financial patterns over time." |
| CTA | None |

Shown when `trendsData` has no entries.

```tsx
<WidgetEmptyState
  icon={TrendingUp}
  title="No trends data yet"
  description="Keep using Remitwise to see your financial patterns over time."
/>
```

---

### Insights

#### Remittance Trend Chart (`components/Insights/remittanceTrendChart.tsx`)

| Property | Value |
|---|---|
| Icon | `Activity` |
| Title | "No activity timeline" |
| Description | "Your remittance trend timeline will appear here once you send money." |
| CTA | "Send money" → `/send` |

Shown when the `data` array prop is empty.

```tsx
<WidgetEmptyState
  icon={Activity}
  title="No activity timeline"
  description="Your remittance trend timeline will appear here once you send money."
  ctaLabel="Send money"
  ctaHref="/send"
/>
```

See also [docs/activity-timeline-empty-state.md](activity-timeline-empty-state.md) for the full design rationale for this state.

---

#### Insights Page — no period data (`app/dashboard/insight/page.tsx`)

| Property | Value |
|---|---|
| Icon | None (uses `WidgetStates.WidgetEmptyState`) |
| Title | "No data available" |
| Message | "Try selecting a different period." |
| CTA | None |

Shown when the API returns data but the selected period has no entries at all.

```tsx
import { WidgetEmptyState } from '@/components/ui/WidgetStates';

<WidgetEmptyState title="No data available" message="Try selecting a different period." />
```

---

#### Insights Page — no activity in period (`app/dashboard/insight/page.tsx`)

| Property | Value |
|---|---|
| Icon | None (uses `WidgetStates.WidgetEmptyState`) |
| Title | "No activity" |
| Message | "You have no transactions in this period." |
| CTA | None |

Shown when the API returns a result where `spendingTotal + savingsTotal + billsTotal + insuranceTotal === 0`.

```tsx
<WidgetEmptyState title="No activity" message="You have no transactions in this period." />
```

---

### Transaction pages

Both `/transactions` (`app/transactions/page.tsx`) and `/dashboard/transaction-history` (`app/dashboard/transaction-history/page.tsx`) share the same two empty states.

#### No transactions at all

| Property | Value |
|---|---|
| Icon | `Inbox` |
| Title | i18n key `transactionHistory.emptyState.title` |
| Description | i18n key `transactionHistory.emptyState.description` |
| CTA | i18n key `transactionHistory.emptyState.cta` → `/send` |

Shown when the user has no transaction history whatsoever.

```tsx
<WidgetEmptyState
  icon={Inbox}
  title={t('transactionHistory.emptyState.title')}
  description={t('transactionHistory.emptyState.description')}
  ctaLabel={t('transactionHistory.emptyState.cta')}
  ctaHref="/send"
/>
```

---

#### No results matching filters

| Property | Value |
|---|---|
| Icon | `SearchX` |
| Title | i18n key `transactionHistory.noResults.title` |
| Description | i18n key `transactionHistory.noResults.description` |
| CTA | i18n key `transactionHistory.noResults.clearFilters` (clears current filters) |

Shown when the user has transactions but the active filter/search returns zero matches.

```tsx
<WidgetEmptyState
  icon={SearchX}
  title={t('transactionHistory.noResults.title')}
  description={t('transactionHistory.noResults.description')}
  ctaLabel={t('transactionHistory.noResults.clearFilters')}
  onAction={clearFilters}
/>
```

---

### Bills

Both Bills empty states use the legacy `WidgetEmptyState` from `components/ui/WidgetStates.tsx`, which renders a fixed `AlertCircle` icon and no CTA.

#### Unpaid Bills (`components/Bills/UnpaidBillsSection.tsx`)

| Property | Value |
|---|---|
| Icon | `AlertCircle` (built into `WidgetStates.WidgetEmptyState`) |
| Title | "No unpaid bills" |
| Message | "You're all caught up on your upcoming payments!" |
| CTA | None |

```tsx
import { WidgetEmptyState } from '@/components/ui/WidgetStates';

<WidgetEmptyState
  title="No unpaid bills"
  message="You're all caught up on your upcoming payments!"
/>
```

---

#### Recent Payments (`components/Bills/RecentPaymentsSection.tsx`)

| Property | Value |
|---|---|
| Icon | `AlertCircle` (built into `WidgetStates.WidgetEmptyState`) |
| Title | "No recent payments" |
| Message | "Paid bills will appear here once processed." |
| CTA | None |

```tsx
<WidgetEmptyState
  title="No recent payments"
  message="Paid bills will appear here once processed."
/>
```

---

### Send / Recurring schedules

#### Recurring Schedules page (`app/send/recurring/page.tsx`)

| Property | Value |
|---|---|
| Icon | `CalendarClock` |
| Title | "No recurring schedules" |
| Description | "Create a new schedule to start automating remittances." |
| CTA | None |

```tsx
<WidgetEmptyState
  icon={CalendarClock}
  title="No recurring schedules"
  description="Create a new schedule to start automating remittances."
/>
```

---

### Family wallet

#### Family Member Detail Drawer — no member selected (`app/family/components/FamilyMemberDetailDrawer.tsx`)

| Property | Value |
|---|---|
| Icon | `Users` |
| Title | i18n key `familyDrawer.emptyTitle` (default: "No member selected") |
| Description | i18n key `familyDrawer.emptyDescription` (default: "Select a member from the list to view details.") |
| CTA | i18n key `familyDrawer.emptyCtaLabel` (default: "View family") → `/family` |

```tsx
<WidgetEmptyState
  icon={Users}
  title={t('familyDrawer.emptyTitle', 'No member selected')}
  description={t('familyDrawer.emptyDescription', 'Select a member from the list to view details.')}
  ctaLabel={t('familyDrawer.emptyCtaLabel', 'View family')}
  ctaHref="/family"
/>
```

---

#### Family Member Detail Drawer — no activity for member (`app/family/components/FamilyMemberDetailDrawer.tsx`)

| Property | Value |
|---|---|
| Icon | `Activity` |
| Title | i18n key `familyDrawer.noActivityTitle` (default: "No recent activity") |
| Description | i18n key `familyDrawer.noActivityDescription` (default: "This member has no spending recorded for the current cycle.") |
| CTA | i18n key `familyDrawer.emptyCtaLabel` (default: "View family") → `/family` |

```tsx
<WidgetEmptyState
  icon={Activity}
  title={t('familyDrawer.noActivityTitle', 'No recent activity')}
  description={t('familyDrawer.noActivityDescription', 'This member has no spending recorded for the current cycle.')}
  ctaLabel={t('familyDrawer.emptyCtaLabel', 'View family')}
  ctaHref="/family"
/>
```

---

#### Approvals Queue (`app/family/components/ApprovalsQueue.tsx`)

| Property | Value |
|---|---|
| Icon | `Users` |
| Title | i18n key `approvals_queue.empty_title` |
| Description | i18n key `approvals_queue.empty_description` |
| CTA | None |

```tsx
<WidgetEmptyState
  icon={Users}
  title={t('approvals_queue.empty_title')}
  description={t('approvals_queue.empty_description')}
/>
```

---

### Admin panel (`app/admin/page.tsx`)

#### No audit events

| Property | Value |
|---|---|
| Icon | `Activity` |
| Title | "No audit events" |
| Description | "No audit events have been recorded yet." |
| CTA | None |

#### No users

| Property | Value |
|---|---|
| Icon | `Users` |
| Title | "No users" |
| Description | "No users have been created yet." |
| CTA | None |

#### No DLQ events

| Property | Value |
|---|---|
| Icon | `AlertTriangle` |
| Title | "No DLQ events" |
| Description | "Great! There are no failed webhook events in the dead-letter queue." |
| CTA | None |

---

## Icon-to-context mapping

The table below makes the semantic intent of each icon explicit so future additions are consistent.

| Lucide icon | Semantic meaning in RemitWise | Used in |
|---|---|---|
| `Activity` | Timeline / event stream / member spend activity | Remittance Trend Chart, Family Member activity, Admin audit |
| `AlertCircle` | Neutral "nothing here" notice (legacy Bills usage) | Unpaid Bills, Recent Payments |
| `AlertTriangle` | Warning / operational concern | Admin DLQ empty state |
| `ArrowLeftRight` | Send / transfer activity | Recent Transactions widget |
| `CalendarClock` | Scheduled / recurring events | Recurring Schedules page |
| `Inbox` | Zero-history state for a ledger | Transaction History pages |
| `PieChart` | Budget allocation / distribution | Money Distribution widget |
| `PiggyBank` | Savings goals | Savings by Goal widget |
| `SearchX` | No results for an active query | Transaction filter empty state |
| `TrendingUp` | Financial trends over time | Six-Month Trends widget |
| `Users` | Family / member context | Family Drawer, Approvals Queue, Admin users |

---

## Adding a new empty state

1. Import the icon from `lucide-react`. Check the table above first — reuse an existing icon if the context matches.
2. Use `WidgetEmptyState` (default export from `components/ui/WidgetEmptyState.tsx`).
3. Provide a `ctaHref` or `onAction` whenever the user has a clear next step to resolve the empty state.
4. Add a row to this document before opening your PR.

---

## Related documentation

- [`components/ui/WidgetEmptyState.tsx`](../components/ui/WidgetEmptyState.tsx) — primary empty-state component source.
- [`components/ui/WidgetStates.tsx`](../components/ui/WidgetStates.tsx) — legacy `WidgetEmptyState` and `WidgetErrorState`.
- [Component States Guide](COMPONENT_STATES.md) — full guide to Default, Hover, Focus, Disabled, Error, and Loading states.
- [Icon System](ICON_SYSTEM.md) — icon sizing conventions, usage rules, and how to add custom icons.
- [Activity Timeline Empty State](activity-timeline-empty-state.md) — design rationale for the Remittance Trend Chart empty state.
