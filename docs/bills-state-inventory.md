# Bills Module – Component State Inventory

> **Purpose:** Reduce implementation ambiguity by enumerating every UI state, copy, and interaction note for each Bills component. Cross-reference with `docs/DESIGN_QA_CHECKLIST.md` before shipping.
>
> **Route:** `/bills` → `app/bills/page.tsx`
> **Last updated:** 2026-04-28

---

## Table of Contents

1. [Status Model](#1-status-model)
2. [BillsCard](#2-billscard)
3. [UnpaidBillsSection](#3-unpaidbillssection)
4. [RecentPaymentsSection](#4-recentpaymentssection)
5. [BillPaymentsStatsCards](#5-billpaymentsstatscard)
6. [Add Bill Form](#6-add-bill-form)
7. [AsyncSubmissionStatus](#7-asyncsubmissionstatus)
8. [AsyncOperationsPanel (sidebar)](#8-asyncoperationspanel-sidebar)
9. [Reminders / Due-Soon](#9-reminders--due-soon)
10. [Edge States & Global Notes](#10-edge-states--global-notes)

---

## 1. Status Model

All bill status values are derived by `lib/bills/urgency.ts`. No component should compute urgency independently.

| Status | Trigger condition | Days diff |
|--------|-------------------|-----------|
| `overdue` | Due date is in the past | `diff < 0` |
| `urgent` | Due within 0–3 days (inclusive) | `0 ≤ diff ≤ 3` |
| `upcoming` | Due in 4+ days | `diff > 3` |
| `paid` | Manually set; never derived from date | — |

**`daysInfo` label mapping** (from `computeDaysInfo`):

| Condition | Label |
|-----------|-------|
| `diff < 0` | `{n}d overdue` |
| `diff === 0` | `Due today` |
| `diff === 1` | `Due tomorrow` |
| `diff > 1` | `{n}d left` |
| Paid | `Paid` (hardcoded in mock; real API should return this) |

**Recurring fields** (optional on `Bill`):

- `isRecurring: boolean` — drives the recurring badge and charge-type label
- `recurrenceLabel?: string` — e.g. `"Monthly"`, `"Weekly"`
- `nextOccurrence?: string` — ISO date of the next charge; shown in the recurring badge tooltip/sub-label

---

## 2. BillsCard

**File:** `components/Bills/BillsCard.tsx`  
**Variants:** `comfortable` (default) | `compact` (when `density === "compact"` from `DensityContext`)

### 2.1 StatusBadge

Rendered inside every card variant.

| State | Icon | Badge copy | Badge color tokens |
|-------|------|------------|--------------------|
| `overdue` | `AlertCircle` | **Overdue** | `status-error-*` (red) |
| `urgent` | `AlertCircle` | **Due Soon** | `status-warning-*` (amber) |
| `upcoming` | `Clock4` | **Upcoming** | `status-info-*` (blue) |
| `paid` | `CheckCircle2` | **Paid** | `status-success-*` (green) |

- `aria-label` must be `"Status: {label}"` — already implemented; do not remove.
- Icon is `aria-hidden="true"`.

### 2.2 RecurringBadge

Shown when `bill.isRecurring === true`.

| Field present | Display |
|---------------|---------|
| `recurrenceLabel` only | `{recurrenceLabel}` (e.g. "Monthly") |
| `recurrenceLabel` + `nextOccurrence` | `{recurrenceLabel} · Next {formattedDate}` |
| Neither | `Recurring` (fallback copy) |

**Interaction note:** The badge is informational only — no click action. If `nextOccurrence` is in the past (missed recurrence), surface a warning variant matching `urgent` color tokens.

### 2.3 Comfortable card states

| State | Due-date row | Pay Now button | Glow / border |
|-------|-------------|----------------|---------------|
| `overdue` | Red bg (`status-error-soft`), red border | Visible, red gradient | `border-status-error-border` |
| `urgent` | Amber bg (`status-warning-soft`), amber border | Visible, red gradient | `border-status-warning-border` |
| `upcoming` | Blue bg (`status-info-soft`), blue border | Visible, red gradient | `border-status-info-border` |
| `paid` | Green bg (`status-success-soft`), green border | **Hidden** | `border-status-success-border` |

**Charge-type sub-label** (below status badge):

| `isRecurring` | Icon | Copy |
|---------------|------|------|
| `true` | `Repeat` | `Recurring charge` |
| `false` | `CalendarClock` | `One-time charge` |

**Pay Now button:**

- Label: `Pay Now` with `Zap` icon.
- Disabled state: not currently implemented — add `disabled` + `aria-disabled` when a payment is in-flight for this bill.
- Loading state: replace label with `<Loader2 className="animate-spin" /> Processing…` while the XDR is being submitted.
- Hidden entirely when `status === "paid"`.

### 2.4 Compact card states

Same status logic as comfortable. Differences:

- Amount is right-aligned, larger (`text-lg`).
- Due date is collapsed into a single line: `{category} · Due {dueDate}`.
- Pay Now is an icon-only button (`Zap`). Must include `title="Pay Now"` and `aria-label="Pay Now"` for accessibility.
- No recurring badge — recurring is not surfaced in compact mode. Consider adding a `Repeat` icon indicator if space allows.

### 2.5 Edge states

| Scenario | Expected behavior |
|----------|-------------------|
| `amount === 0` | Show `$0.00`; do not hide the card. Flag as a data anomaly in dev. |
| `title` is very long (>40 chars) | Truncate with `truncate` class; full title in `title` attribute for tooltip. |
| `dueDate` is missing / invalid | Show `—` in the due date field; log a console warning. |
| `isRecurring === true` but `recurrenceLabel` absent | Fall back to `"Recurring"` copy. |
| `nextOccurrence` is in the past | Show recurring badge with `urgent` color tokens and copy `"Missed recurrence"`. |

---

## 3. UnpaidBillsSection

**File:** `components/Bills/UnpaidBillsSection.tsx`

Filters `mockBills` (or API data) to statuses `['overdue', 'urgent', 'upcoming']`.

### States

| State | Condition | Header sub-copy | Grid content |
|-------|-----------|-----------------|--------------|
| **Populated** | ≥1 unpaid bill | `"{n} bills pending payment"` | Grid of `BillsCard` |
| **Empty** | 0 unpaid bills | `"All bills are paid"` | Empty state illustration + copy (see below) |
| **Loading** | Data fetch in-flight | `"Loading bills…"` | Skeleton cards (3 placeholders matching grid layout) |
| **Error** | Fetch failed | `"Could not load bills"` | Inline error message + retry button |

**Empty state copy:**
> **You're all caught up!**
> No unpaid bills right now. New bills you add will appear here.

**Interaction notes:**
- Section header "Unpaid Bills" is an `<h2>`. Do not change heading level.
- The count in the sub-copy must update reactively when a bill is paid inline.
- Density toggle (`compact` / `comfortable`) switches between `flex-col` list and CSS grid — already implemented.

### Edge states

| Scenario | Behavior |
|----------|----------|
| All bills are `upcoming` (none overdue/urgent) | Section still renders; no special callout needed. |
| Mix of recurring and one-time bills | No grouping required; sort order: `overdue` → `urgent` → `upcoming`. |
| Single bill | Grid renders one card; no layout change needed. |

---

## 4. RecentPaymentsSection

**File:** `components/Bills/RecentPaymentsSection.tsx`

Renders `mockPaidBills` (or API data filtered to `status === "paid"`).

### States

| State | Condition | Sub-copy | Content |
|-------|-----------|----------|---------|
| **Populated** | ≥1 paid bill | `"Last {n} payments"` | Grid of `BillsCard` (paid variant) |
| **Empty** | 0 paid bills | `"No payments yet"` | Empty state (see below) |
| **Loading** | Fetch in-flight | — | Skeleton cards |
| **Error** | Fetch failed | — | Inline error + retry |

**Empty state copy:**
> **No payments recorded yet.**
> Bills you pay will appear here for your records.

**Interaction notes:**
- Section uses `role="list"` on the grid and each `BillsCard` should carry `role="listitem"` in this context.
- Paid cards have no Pay Now button — verify `status === "paid"` suppresses it.
- Density toggle applies identically to `UnpaidBillsSection`.

---

## 5. BillPaymentsStatsCards

**File:** `app/bills/components/BillPaymentsStatsCards.tsx`

Three stat tiles: **Total Unpaid**, **Overdue Bills**, **Paid This Month**.

### Per-tile states

#### Total Unpaid

| State | Amount display | Sub-copy |
|-------|---------------|----------|
| Normal | `${amount}` | `"{n} bills pending"` |
| Zero unpaid | `$0` | `"0 bills pending"` |
| Loading | Skeleton | — |

#### Overdue Bills

| State | Count display | Sub-copy | Color |
|-------|--------------|----------|-------|
| ≥1 overdue | `{n}` | `"Requires immediate attention"` | `text-red-500` |
| 0 overdue | `0` | `"No overdue bills"` | `text-gray-400` (neutral) |
| Loading | Skeleton | — | — |

**Interaction note:** When `overdueCount === 0`, change sub-copy to neutral and remove the red `AlertCircle` badge background — use a muted icon instead to avoid false urgency.

#### Paid This Month

| State | Amount display | Sub-copy |
|-------|---------------|----------|
| Normal | `${amount}` | `"{n} payments made"` |
| Zero paid | `$0` | `"No payments this month"` |
| Loading | Skeleton | — |

### Edge states

| Scenario | Behavior |
|----------|----------|
| Stats API unavailable | Show `—` in all amount/count fields; do not crash. |
| Very large amounts (>6 digits) | Use compact notation: `$1.2M`, `$10K`. |

---

## 6. Add Bill Form

**Location:** `app/bills/page.tsx` (inline form section)

### Form field states

#### Bill Name (`name`)

| State | Visual | Copy |
|-------|--------|------|
| Empty / idle | Placeholder: `e.g., Electricity, School Fees, Rent` | — |
| Focused | Red focus ring (`focus:ring-red-500`) | — |
| Validation error | Red error text below field | `{validationErrors[name].message}` |
| Filled | Normal border | — |

#### Amount (`amount`)

| State | Visual | Copy |
|-------|--------|------|
| Empty / idle | Placeholder: `50.00`, `$` prefix | — |
| Focused | Red focus ring | — |
| Validation error | Red error text | `{validationErrors[amount].message}` |
| Zero or negative | Validation error | `"Amount must be greater than 0"` |

#### Due Date (`dueDate`)

| State | Visual | Copy |
|-------|--------|------|
| Empty / idle | Native date picker | — |
| Past date selected | Validation error | `"Due date cannot be in the past"` |
| Validation error | Red error text | `{validationErrors[dueDate].message}` |

**Note:** Past-date validation is not yet enforced in `actions.ts` — add `z.coerce.date().min(new Date(), ...)` when the action is uncommented.

#### Recurring toggle (`recurring`)

| State | Visual | Behavior |
|-------|--------|----------|
| Unchecked (default) | Unchecked checkbox | No frequency field shown |
| Checked | Red checkbox | Reveal `frequencyDays` input (not yet implemented — see edge states) |

**Edge state:** When `recurring === true`, the API requires `frequencyDays > 0`. The form must reveal a frequency input and validate it before submission. This field is absent from the current UI — it must be added before the action is enabled.

### Submit button states

| State | Label | Visual |
|-------|-------|--------|
| Idle | `Add Bill` | Red bg, full opacity |
| Pending | `Preparing Contract Request…` | `Loader2` spinner, `disabled`, 70% opacity |
| Success | Resets to idle after `AsyncSubmissionStatus` clears | — |
| Error | Resets to idle; error shown in `AsyncSubmissionStatus` | — |

**Interaction note:** The button is `disabled` during `pending`. Do not re-enable it until the async status resolves (success or error) to prevent duplicate submissions.

---

## 7. AsyncSubmissionStatus

**File:** `components/AsyncSubmissionStatus.tsx` (shared component, used in bills form)

| State | Title | Description |
|-------|-------|-------------|
| Idle | `"Submission placement"` | Explains inline vs. stack placement pattern |
| Pending | `"Preparing bill contract request"` | `"Hold the user in this form context until the bill payload is ready for wallet approval."` |
| Success | `"Bill contract request created"` | `"The next step should open wallet approval immediately…"` |
| Error | `"Bill request could not be prepared"` | Error detail from `state.error` |

**Interaction notes:**
- The idle state is instructional copy for developers/designers — replace with a neutral placeholder or hide it in production.
- On success, the wallet approval modal/sheet should open automatically without requiring another user action.
- On error, the form fields must remain populated (controlled via `defaultValue={state.*}`) so the user can correct and resubmit.

---

## 8. AsyncOperationsPanel (sidebar)

**File:** `components/AsyncOperationsPanel.tsx` (shared component, used in bills page sidebar)

Displays the four-stage bill submission pattern and a live queue of async operations.

### Stage states

| Stage | Duration hint | Placement guidance |
|-------|--------------|-------------------|
| Validate bill details | 0–2 sec | Inline at field level |
| Prepare contract payload | 2–6 sec | Inline above submit button |
| Collect wallet approval | 15–45 sec | Wallet modal or sheet |
| Submit and confirm | 5–30 sec | Top-right desktop, inline mobile |

### Queue item states

| Status | Visual | Copy pattern |
|--------|--------|--------------|
| `active` | Expanded, highlighted | Primary submission in progress |
| `queued` | Compressed | Secondary task waiting |
| `complete` | Success indicator | Brief success visible before auto-dismiss |

**Interaction note:** On mobile, the sidebar collapses below the form. The queue stack should render directly below the form footer, not in a fixed overlay, to avoid obscuring the keyboard.

---

## 9. Reminders / Due-Soon

**Endpoint:** `GET /api/bills/due-soon`  
**Docs:** `docs/bill-reminders.md`

The endpoint returns bills where `dueDate ≤ today + 7 days`, including overdue bills.

### Reminder banner / notification states

| State | Condition | Copy |
|-------|-----------|------|
| No reminders | 0 bills due soon | Do not render the banner |
| 1 bill due | 1 result | `"{Bill name} is due {daysInfo}"` |
| Multiple bills due | ≥2 results | `"{n} bills are due soon — view all"` |
| Overdue included | Any result with `diff < 0` | Prepend overdue count: `"{n} overdue · {m} due soon"` |
| API error | Fetch fails | Silently suppress; do not block page render |

**Interaction notes:**
- Poll on dashboard load and once per day (or on page focus).
- Clicking the banner scrolls to `UnpaidBillsSection` or filters to the relevant bill.
- Overdue bills must remain in the reminder list until `status` transitions to `paid` — they are not auto-dismissed by date.
- Reminder state is not persisted client-side; re-fetch on each page load.

---

## 10. Edge States & Global Notes

### Density context

All bill list components consume `useDensity()` from `lib/context/DensityContext`. The toggle is global — changing it affects `UnpaidBillsSection`, `RecentPaymentsSection`, and any future bill list simultaneously.

| Density | Layout | Card variant |
|---------|--------|--------------|
| `comfortable` | CSS grid (1 → 2 → 3 cols) | Full comfortable card |
| `compact` | Single-column flex list | Compact card row |

### Accessibility checklist (per DESIGN_QA_CHECKLIST.md §4)

- [ ] All status badges have `aria-label="Status: {label}"`.
- [ ] Icon-only Pay Now button in compact mode has `aria-label="Pay Now"`.
- [ ] `UnpaidBillsSection` heading is `<h2>`; `RecentPaymentsSection` heading is `<h2>`.
- [ ] `RecentPaymentsSection` grid has `role="list"`; cards have `role="listitem"`.
- [ ] Color is never the sole differentiator — each status uses a distinct icon.
- [ ] Focus ring is visible on all interactive elements (`focus-visible:ring-2 focus-visible:ring-red-400`).
- [ ] Form inputs have associated `<label>` elements (currently using `htmlFor` — verify IDs match).

### Data / API integration notes

- Current implementation uses `mockBills` and `mockPaidBills`. Replace with `GET /api/bills` (paginated, cursor-based) when the API is live.
- `POST /api/bills` returns `{ xdr: string }`. The frontend must sign the XDR and submit to Horizon — this step is not yet wired up. The form's success state should trigger the wallet signing flow, not show a final confirmation.
- `POST /api/bills/[id]/pay` and `POST /api/bills/[id]/cancel` follow the same XDR pattern.
- The `recurring` + `frequencyDays` field pairing must be validated together: if `recurring === true` and `frequencyDays` is absent or `≤ 0`, the API returns a 400.

### Open questions

1. **Frequency input UI** — What control for `frequencyDays`? Numeric input, dropdown (Weekly/Monthly/Custom), or both?
2. **Inline pay confirmation** — Should "Pay Now" open a confirmation modal before building the XDR, or proceed immediately?
3. **Overdue auto-escalation** — Should an `urgent` bill automatically become `overdue` client-side at midnight, or only on next page load / API refresh?
4. **Compact mode recurring indicator** — Is a `Repeat` icon sufficient, or should the recurrence label be shown in compact rows?
5. **Stats cards data source** — Are stats derived client-side from the bills list, or fetched from a dedicated `/api/bills/stats` endpoint?
