# Concurrency and retry contract (webhooks and transfer flows)

## Invariants

- An event is processed only after an atomic conditional claim changes it from `pending` or retryable `failed` to `processing`.
- Exactly one concurrent worker can claim an event. Losing workers return without invoking the handler, so external side effects are not duplicated by this boundary.
- Completion and failure transitions are conditional on `processing`; a stale worker cannot overwrite a newer state.
- A DLQ replay is conditional on `status = dlq`, resets retry state, and returns `false` when another request already replayed or processed the event.

## Failure and client behavior

The admin replay endpoint preserves its existing response shapes: `200` means the event was atomically moved to `pending`, `404` means it was absent or no longer in the DLQ, and `500` means the persistence operation failed. Clients should treat `404` as a stale/repeated operation and refresh the DLQ; they may retry `500` with the same request, preferably using a bounded backoff. A successful replay is safe to repeat because subsequent attempts return `404` without changing state.

The processing endpoint remains parallel by event. Contention is resolved in the database rather than with process-local locks, so the guarantee also applies across multiple application instances. A worker that loses a claim performs no handler work.

## Compatibility and operations

No public success or error response shape changed. The implementation requires the existing Prisma `webhookEvent.updateMany` operation and its status fields; no migration is required. Rollback is a code rollback only. Operators should monitor `processing` events and retry failures; a permanently unavailable database prevents claims and leaves events unchanged.

## Security and correctness

Admin authorization remains enforced before replay or processing actions. Conditional state transitions prevent stale or unauthorized follow-up work from changing an event after its state has moved on. This is an at-most-once handler invocation guarantee per successful claim; delivery semantics and downstream idempotency remain the responsibility of each webhook handler.

## Transfer composition and quote concurrency

The same conditional-state-transition pattern applies to the transfer flow. A transfer may only be submitted when the client's displayed quote is the latest authorized quote for that transfer. During submission, the server atomically claims the transfer (`status = submitted`) only if the attached quote ID and amount still match the current authorized quote; otherwise it returns `409 Conflict` and leaves the transfer unchanged. Losing concurrent submissions receive the same `409`; the first successful claim wins.

A transfer that was rejected, stale, repeated, or failed leaves no partial state: the transfer remains in its previous valid status with the previously displayed quote, and the client must refetch the quote before retrying. Retries after a `409` are safe to repeat only after refreshing the quote; retries after a transient `503` may use the same payload because the atomic claim makes duplicate commits impossible. Existing public response shapes and error codes are preserved; no migration is required because the implementation uses the current Prisma updateMany conditional updates.
