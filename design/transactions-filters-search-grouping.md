# Transactions — Filters, search, and grouping

Scope: UI/UX only for `/transactions` (filters, search, result grouping, empty vs no-results). Does **not** change list density/readability (UX-013).

Branch: `uiux/transactions-filters-search-grouping`

Reference
- `app/transactions/page.tsx`
- `components/Dashboard/TransactionHistoryItem.tsx`
- `app/dashboard/transaction-history/` (Horizon-backed cousin; keep patterns aligned, do not merge pages)
- Screenshots under `app/dashboard/transaction-history/Screenshots/` (empty vs no-results reference)

---

## 1. Control bar (375px & 1280px)

### Desktop (1280px)
- One filter panel under the page heading.
- Row 1: search field (flex-grow) + results summary card (`Showing {{count}} of {{total}}`, `aria-live="polite"`).
- Row 2: type chips | status chips (two-column grid on `xl`).
- Row 3: date range (from / to).
- Row 4: active-filter pills + Clear all.
- Row 5: sort (Date / Amount).

### Mobile (375px)
- Same sections stack vertically; chips wrap; min hit target 40–48px.
- Export stays in the page header; disabled when filtered set is empty.

---

## 2. Filter chips

### Type (multi-select OR within type; AND with other dimensions)
Primary (visually emphasized): **Send Money**, **Smart Split**, **Bill Payment**, **Insurance**.  
Secondary: Savings, Family Transfer, Received.

- **All types** chip clears type selection (empty selection = no type constraint).
- Selected chips use `aria-pressed="true"` and type-colored tones so Send / Split / Bills / Insurance stay distinguishable.

### Status (multi-select)
Completed · Pending · Failed — same OR-within / AND-across rules. **All statuses** clears status selection.

### Date range
Inclusive local-calendar bounds. Clearing either bound via the range X or Clear all.

### Search
Debounced 300ms. Matches id, recipient, type, status, amount, currency (case-insensitive substring).

### Active filters summary
- Pills for: search query, each type, each status, date range.
- Each pill has a remove control (`Remove {{label}} filter`).
- **Clear all** resets every dimension and returns focus to the search field.

### Combinations (truth table)

| Types | Statuses | Search | Date | Result set |
|-------|----------|--------|------|------------|
| none | none | empty | none | all |
| A,B | none | empty | none | type ∈ {A,B} |
| none | Pending | empty | none | status = Pending |
| Send Money | Completed | “maria” | from–to | ∩ of all four |
| any | any | no match | any | **no-results** state |

Empty type/status selection means “no constraint,” not “match nothing.”

---

## 3. Date grouping

Local timezone, Monday-start week.

| Group | Boundary |
|-------|----------|
| **Today** | Same calendar day as `now` |
| **This Week** | From Monday 00:00 of the current week through yesterday (excludes today) |
| **Earlier** | Before Monday 00:00 of the current week |

Order on page: Today → This Week → Earlier. Empty groups are omitted (not shown as empty sections).

Sort (Date / Amount, asc/desc) applies **within** the filtered set before grouping; group order itself is fixed.

---

## 4. Empty vs no-results vs loading

| State | When | UI |
|-------|------|----|
| Loading | Initial fetch / skeleton (dashboard history) | Distinct loading UI — **not** the empty illustration |
| Empty | Source list length = 0 | Inbox icon, “No transactions yet”, CTA → Send |
| No results | Source has items, filters match 0 | SearchX icon, “No matching transactions”, CTA → Clear filters (focus → search) |

Never reuse the empty copy for a filtered miss.

---

## 5. Accessibility

- Search: visible label via `sr-only` + `aria-describedby` → results count.
- Results count: `aria-live="polite"` + `aria-atomic="true"`.
- Filter chips: `aria-pressed`.
- Fieldsets/legends for type, status, date range.
- Clear-all / no-results CTA restores focus to search.
- Export menu: `aria-expanded`, `role="menu"` / `menuitem`, Escape closes.

---

## 6. Visual QA checklist

- [ ] 375px: chips wrap, search full width, groups readable, no horizontal clip.
- [ ] 1280px: type/status two-column, results card aligned with search.
- [ ] Active pills update when toggling chips / search / dates.
- [ ] Today / This Week / Earlier appear correctly with relative sample data.
- [ ] No-results ≠ empty; Clear filters restores list + focuses search.
- [ ] `npm run lint` / `npm run build`
