# Anchor Flows, Admin Routes, and Graceful Shutdown

## Anchor deposit/withdraw APIs

Protected endpoints:
- `POST /api/anchor/deposit`
- `POST /api/anchor/withdraw`

Request bodies:
- Deposit: `{ "amount": number|string, "currency": "USD", "destination"?: string }`
- Withdraw: `{ "amount": number|string, "currency": "USD", "destinationAccount"?: string }`

Behavior:
- Uses `ANCHOR_API_BASE_URL` + interactive flow paths (`ANCHOR_DEPOSIT_PATH`, `ANCHOR_WITHDRAW_PATH`).
- Returns anchor flow response (`url` and/or `steps`) to drive frontend flow UX.
- Returns `501 Not Implemented` when `ANCHOR_API_BASE_URL` is missing.
- Stores pending flows in in-memory store for webhook status reconciliation.

Environment variables:
- `ANCHOR_API_BASE_URL` (required for deposit/withdraw)
- `ANCHOR_API_KEY` (optional bearer token)
- `ANCHOR_DEPOSIT_PATH` (default `/transactions/deposit/interactive`)
- `ANCHOR_WITHDRAW_PATH` (default `/transactions/withdraw/interactive`)
- `ANCHOR_WEBHOOK_SECRET` (webhook signature verification)

## Admin/internal routes

Admin routes:
- `POST /api/admin/cache/clear`
- `GET /api/admin/users?limit=20`
- `GET /api/admin/audit?limit=50`

Authentication:
- Header: `X-Admin-Key: <ADMIN_SECRET>`
- Cookie: `admin_key=<ADMIN_SECRET>` or `admin_secret=<ADMIN_SECRET>`

Security notes:
- Rotate `ADMIN_SECRET` periodically.
- Optionally enforce upstream IP allowlist for `/api/admin/*`.

## Graceful shutdown (in-process background jobs)

For Node server mode where background work runs in-process:
- Signal handlers for `SIGTERM` and `SIGINT` are registered.
- A shutdown flag stops accepting new background jobs.
- Existing in-flight background jobs are awaited up to `SHUTDOWN_TIMEOUT_MS` (default `15000` ms).
- Nonce cache timer is stopped via shutdown hook.

If production scheduling uses external cron/workers (for example Vercel Cron or separate workers), this in-process shutdown path remains optional and low-impact.

