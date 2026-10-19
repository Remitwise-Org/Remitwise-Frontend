# Bill Reminders (Due-Soon Notifications)

Polling-based endpoint that returns bills due soon for the authenticated wallet.
Bills due within the next **4 days (96 hours)** are surfaced. Overdue bills are
always included so reminders persist until resolved.

## Endpoint

`GET /api/bills/due-soon`

- Protected by session cookie auth.
- Returns: `[{ billId, name, amount, dueDate, urgency }]`
- Due-soon definition: `dueDate <= today + 4 days` (inclusive); overdue bills always included.

## Urgency field

Each reminder now includes a pre-computed `urgency: BillUrgency` value
(`'overdue' | 'urgent' | 'upcoming'`). UI components must use this field
directly — do not re-derive urgency from `dueDate` in the frontend.

## Presentation helpers (`lib/bills-reminders.ts`)

### `getReminderPresentation(reminder)`

Returns a `SemanticStatusPresentation` (icon, badge/panel/meta class names, label)
sourced from `getBillStatusPresentation`. This keeps reminder UI consistent with
`BillsCard` and all other status surfaces.

```ts
const presentation = getReminderPresentation(reminder);
// presentation.icon, presentation.badgeClassName, presentation.panelClassName, …
```

### `getReminderCopy(reminder)`

Returns `{ title, body, cta }` copy strings for a reminder banner or notification.
Copy is calibrated per urgency tier to avoid alert fatigue:

| Urgency | Title pattern | CTA |
|---------|--------------|-----|
| `overdue` | `"{name} is overdue"` | **Pay now** |
| `urgent` (today) | `"{name} is due today"` | **Pay now** |
| `urgent` (tomorrow) | `"{name} is due tomorrow"` | **Review bill** |
| `upcoming` (2–4 days) | `"{name} due in {n} days"` | **View bill** |

## Anti-alert-fatigue rules

- Show at most **one banner** per page load. If multiple bills are due, show the
  highest-urgency one and link to the full unpaid list.
- Do not show a reminder banner if the user is already on `/bills`.
- Overdue reminders use `error` tone (red). Urgent uses `warning` (amber).
  Upcoming uses `info` (blue) — no alarm styling.
- Do not repeat the same reminder within the same session unless the user
  navigates away and returns.

## Recurring bill UI contract

The add-bill form exposes recurring bills as an explicit switch, not a checkbox.
Use the shared `Toggle` component with `role="switch"`, `aria-checked`, a visible
On/Off badge, and an associated label (`Repeat this bill`). The switch must be
keyboard operable by default as a button and keep the schedule fields collapsed
while off.

When the switch is on, show the schedule editor directly below the switch:

- Frequency: `Monthly` or `Weekly`
- Monthly day: `1st` through `28th`
- Weekly day: weekday selector
- Reminder lead time: `1 day before`, `3 days before`, or `5 days before`
- Card label preview: the exact recurrence label that will appear on bill cards

Bill cards use this recurrence label format:

| Schedule | Card label |
|----------|------------|
| Monthly day of month | `Monthly on the 1st` |
| Weekly day of week | `Weekly on Monday` |

Unpaid recurring bills remain in the same urgency-sorted unpaid list as one-time
bills. Their recurrence appears as a compact badge on comfortable cards and in
the metadata line on compact rows, while the unpaid section summary includes a
recurring count such as `5 bills pending payment - 4 recurring`.

## Strategy

Current implementation is **polling** (on dashboard load / daily). The same
`getBillsDueSoon` helper can be called from a cron worker for push/email delivery
without changes.
