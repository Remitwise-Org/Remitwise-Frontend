# Bill Reminders (Due-Soon Notifications)

This feature exposes a polling-based endpoint that returns bills due soon for the
authenticated wallet. The endpoint reads unpaid bills from the bill-payments
contract helper and filters those due within the next 7 days (inclusive). Overdue
bills are included so reminders persist until resolved.

## Endpoint

`GET /api/bills/due-soon`

- Protected by session cookie auth.
- Returns: `[{ billId, name, amount, dueDate }]`
- Due-soon definition: `dueDate <= today + 7 days` (inclusive)

## Strategy

Current implementation is **polling**. The frontend can poll this endpoint daily
or on dashboard load. If/when a cron worker is added, it can call the same helper
and store reminders for push/email delivery.
