# E2E: Bill Payment Journey

**Spec file:** `tests/e2e/bill-payment.spec.ts`  
**Run command:** `npm run test:e2e`

## What is tested

| Scenario | Assertion |
|---|---|
| List renders | Unpaid Bills heading + Recent Payments region visible |
| Overdue urgency | Section heading has `text-red-400`, card has `border-red-*` |
| Urgent (due-soon) urgency | Section heading has `text-amber-400`, card has `border-amber-*` |
| Pay Now → success | Clicking/keyboard-entering Pay Now surfaces a toast |
| Keyboard operation | Pay button focusable and triggerable via Enter |
| Paid bills placement | Paid bills absent from unpaid list, present in Recent Payments |
| Empty unpaid state | No overdue/urgent headings when all bills are paid |
| Empty recent state | "No recent payments" message when no paid bills |
| Fetch error state | "Failed to load bills" shown on 500 response |
| Retry after error | Retry button re-fetches and restores the list |
| Mobile viewport | Key UI elements visible at 375 × 812 |

## How stubs work

All network calls are intercepted with `page.route()` before `page.goto('/bills')`.
The pay route (`/api/v1/bills/[id]/pay`) is stubbed to return `{ xdr: "AAAA" }` by default.
Pass `{ payFails: true }` to `stubBillsApi` to simulate a payment failure.

No server startup is required beyond the standard `npm run dev` web server managed by
Playwright's `webServer` config in `playwright.config.ts`.

## Urgency logic

Urgency is driven by `lib/bills/urgency.ts`:

- `diff < 0` → `overdue` (red styling)
- `diff <= 3` → `urgent` (amber styling)
- `diff > 3` → `upcoming` (neutral styling)

The e2e fixtures use `relativeDate(-5)` for overdue and `relativeDate(2)` for urgent so
assertions stay valid regardless of when the tests run.
