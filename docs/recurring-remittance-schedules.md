# Recurring Remittance Schedules

## Overview

Recurring schedules create pending remittance runs when `nextRunAt` is due.
The runner never signs or submits a Stellar transaction; the user must build
and sign each remittance with their wallet.

## Schedule API

- `POST /api/remittance/recurring` — create an authenticated user's schedule
- `GET /api/remittance/recurring` — list the authenticated user's schedules
- `PATCH /api/remittance/recurring/[id]` — update an owned schedule
- `DELETE /api/remittance/recurring/[id]` — delete an owned schedule
- `GET /api/remittance/recurring/[id]/runs` — list pending runs for an owned
  schedule, including the unsigned remittance details

The client can pass `unsignedRemittance` from a pending run to
`POST /api/remittance/build`, then have the wallet sign and submit the returned
XDR.

## Run ledger and idempotency

The background runner checks for schedules with `nextRunAt <= now`. Each
successful run records a `RecurringRun` with status `pending`, the schedule's
recipient, amount and currency at the time it became due, and its `dueAt`.
The unique `(scheduleId, dueAt)` constraint prevents duplicate ledger entries.
Creating the run and advancing the schedule happen in one database transaction;
concurrent runner invocations cannot advance a schedule without recording its
run.

Only one occurrence per due schedule is processed in a pass. If a schedule is
overdue by multiple periods, later occurrences are picked up by subsequent
passes.

## Frequency semantics

- `weekly`: seven days after the due date
- `biweekly`: fourteen days after the due date
- `monthly`: one calendar month after the due date, clamped to the last valid
  day of the target month (for example, January 31 to February 28 or 29)

The due time is preserved in UTC. `lastRunAt` is set to the occurrence's
`dueAt`, and `nextRunAt` advances from that due date.

## Background lifecycle

The Node.js server starts the runner from application instrumentation. Its
interval is configured by `RECURRING_REMITTANCE_PROCESSING_INTERVAL_MS`
(default: 30000 ms). The loop runs once at startup and registers a graceful
shutdown hook that stops the interval; in-flight work is tracked by the
background runtime.
