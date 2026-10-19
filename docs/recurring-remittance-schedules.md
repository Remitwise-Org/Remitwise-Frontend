# Recurring Remittance Schedules (CRUD) - API & Semantics

## Overview
This feature allows users to create and manage recurring remittance schedules (e.g. monthly $300 to recipient X). Schedules are stored in the DB and can be used for reminders or future automation.

## DB Schema: `recurring_remittances`
- `id`: string (UUID)
- `userAddress`: string (user’s public key/address)
- `recipientAddress`: string (recipient’s public key/address)
- `amount`: number
- `currency`: string
- `frequency`: enum ('weekly', 'biweekly', 'monthly')
- `nextRunAt`: Date (timestamp for next scheduled run)
- `lastRunAt`: Date? (timestamp for last run, optional)
- `createdAt`: Date

## API Endpoints
- `POST /api/remittance/recurring` — Create schedule
- `GET /api/remittance/recurring` — List schedules for authenticated user
- `PATCH /api/remittance/recurring/[id]` — Update schedule
- `DELETE /api/remittance/recurring/[id]` — Delete schedule

## Validation
- `amount > 0`
- `frequency` in allowed values
- `recipientAddress` is a valid Stellar address
- `nextRunAt` is computed from frequency

## Authentication
- User must be authenticated; `userAddress` is taken from session/auth

## Optional Cron/Reminders
- A background job (not implemented here) could check for due schedules, build transactions, and notify users to sign or remind them of due sends.

## Example Schedule Semantics
- If frequency is `monthly`, `nextRunAt` is set to one month from creation or last run.
- If frequency is `weekly`, `nextRunAt` is set to 7 days from creation or last run.
- If frequency is `biweekly`, `nextRunAt` is set to 14 days from creation or last run.

---
This document covers the requirements and semantics for #188.
