# Webhook concurrency and retry contract

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
