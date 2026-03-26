# Pull Request: Recurring Remittance Schedules (CRUD) (#188)

## Description
Implements recurring remittance schedules, allowing users to create, view, update, and delete automated remittance plans (e.g., monthly $300 to recipient X). This feature supports reminders and future automation.

## Features
- **DB Schema:** `recurring_remittances` (id, userAddress, recipientAddress, amount, currency, frequency, nextRunAt, lastRunAt, createdAt)
- **API Endpoints:**
  - `POST /api/remittance/recurring` — Create schedule
  - `GET /api/remittance/recurring` — List schedules
  - `PATCH /api/remittance/recurring/[id]` — Update schedule
  - `DELETE /api/remittance/recurring/[id]` — Delete schedule
- **Validation:**
  - Validates amount, frequency, and recipient address
  - Computes `nextRunAt` from frequency
- **Authentication:**
  - Only authenticated users can manage their own schedules
- **Documentation:**
  - Schedule semantics and cron job options documented in code
- **Extensible:**
  - Ready for future cron job integration for reminders/automation

## Acceptance Criteria
- [x] Schema and CRUD API implemented
- [x] Validation and authentication enforced
- [x] Documentation and extensibility for cron jobs

## How to Test
1. Authenticate (login via app or API)
2. Use the following endpoints:
   - **Create:** `POST /api/remittance/recurring` with `{ recipientAddress, amount, currency, frequency }`
   - **List:** `GET /api/remittance/recurring`
   - **Update:** `PATCH /api/remittance/recurring/[id]`
   - **Delete:** `DELETE /api/remittance/recurring/[id]`

See code and previous messages for example curl commands.

## Files Created/Modified
- `app/api/remittance/recurring/route.ts` (new)
- `app/api/remittance/recurring/[id]/route.ts` (new)
- `lib/mockdata/recurringRemittances.ts` (new)
- `utils/types/recurringRemittance.types.ts` (new)

---
Closes #188
