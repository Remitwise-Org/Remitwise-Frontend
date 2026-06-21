# Transactions Filters, Search, and Grouping

## Scope

Issue #428 focuses on the `/transactions` filtering, search, and grouped-list experience. It does not change transaction row density, typography scale, or readability rules covered by UX-013.

## Filter Behavior

- Search matches transaction ID, counterparty, type, status, amount, and currency.
- Search combines with every selected chip using AND logic.
- Type chips are multi-select. With no type selected, all types are included.
- Status chips are multi-select. With no status selected, all statuses are included.
- `All types` clears selected type chips.
- `All statuses` clears selected status chips.
- Active filters are summarized as removable pills below the controls.
- `Clear all` resets search, type chips, and status chips.

## Type Coverage

Primary filter chips cover the requested transaction flows:

- Send Money
- Smart Split
- Bill Payment
- Insurance

Additional activity chips keep the existing mock data discoverable:

- Savings
- Family Transfer
- Received

Each type has a distinct icon and tone in both the filter controls and the grouped result metadata.

## Group Boundaries

The list renders non-empty groups in this order:

- Today: same day as the latest transaction in the dataset.
- This Week: 1 to 7 days older than the latest transaction.
- Earlier: more than 7 days older.

The mock `/transactions` data is dated around June 2, 2026 so desktop and mobile QA show all group states. When this page is connected to live API data, the same boundary helper can use the user's current local date instead of the latest transaction date.

## States

- Empty: shown only when there is no transaction history at all.
- No results: shown when transactions exist but search/filter combinations remove every result.
- Loading: intentionally not rendered on this static mock page; the dashboard transaction-history route still owns API loading/error states.

## QA Targets

- Mobile: 375px wide, filter chips wrap without overlap and search clear remains reachable.
- Desktop: 1280px wide, search/results summary sit side-by-side and grouped result headings scan clearly.
- Accessibility: search has a programmatic label, chip buttons expose `aria-pressed`, results count uses `aria-live`, and clear/remove buttons have explicit labels.
