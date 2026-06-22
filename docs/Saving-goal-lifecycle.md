# Savings Goals — Lifecycle & API State Machine

This document describes the savings-goals lifecycle, the HTTP routes that drive
it, and — importantly — **where each state guard is actually enforced**.

## Routes

| Method & Route                     | Handler kind        | Auth source                                   | Success         |
| ---------------------------------- | ------------------- | --------------------------------------------- | --------------- |
| `POST /api/goals`                  | create (build tx)   | `withAuth` (Bearer / `x-user` / `x-stellar-public-key` / cookie) | `200 { xdr }` |
| `GET  /api/goals`                  | list (mock data)    | `withAuth`                                     | `200 { data, … }` |
| `POST /api/goals/[id]/add`         | build tx            | `getSessionFromRequest` (`x-stellar-public-key` / Bearer 56-char `G…` / cookie) | `200 { xdr }` |
| `POST /api/goals/[id]/withdraw`    | build tx            | `getSessionFromRequest`                        | `200 { xdr }` |
| `POST /api/goals/[id]/lock`        | build tx            | `getSessionFromRequest`                        | `200 { xdr }` |
| `POST /api/goals/[id]/unlock`      | build tx            | `getSessionFromRequest`                        | `200 { xdr }` |
| `GET  /api/goals/[id]/completed`   | read                | `x-public-key` header (presence)               | `200 { completed }` |

## Lifecycle state machine

```
                 create
                   │
                   ▼
            ┌───────────────┐   lock     ┌───────────────┐
            │    UNLOCKED   │ ─────────► │    LOCKED     │
   add ───► │  (add /       │            │  (add allowed │
 withdraw ► │   withdraw    │ ◄───────── │   withdraw    │
            │   allowed)    │   unlock   │   REJECTED)   │
            └───────┬───────┘            └───────────────┘
                    │ currentAmount ≥ targetAmount
                    ▼
            ┌───────────────┐
            │   COMPLETED   │   add / withdraw semantics enforced on-chain
            └───────────────┘
```

Intended invariants (money-safety):
- **Withdraw from a LOCKED goal → rejected.**
- **Add to a COMPLETED goal → rejected.**
- **Over-withdraw (amount > currentAmount) → rejected.**
- **Unlock → withdraw becomes allowed again.**

## ⚠️ Where state guards are enforced (important)

The `add` / `withdraw` / `lock` / `unlock` routes are **transaction builders**.
For a request they:

1. authenticate the caller,
2. validate the `id` path param and the `amount` body field
   (`lib/validation/savings-goals.ts`), then
3. delegate to `build*Tx` in `lib/contracts/savings-goals.ts`, which assembles
   an **unsigned Soroban XDR** and returns it.

They never read the goal's on-chain state. Therefore the lifecycle invariants
above (withdraw-from-locked, add-to-completed, over-withdraw) are **enforced by
the Soroban contract at transaction submission time — not by the HTTP routes**.
The route returns `200 { xdr }` for a syntactically valid request even if the
resulting transaction would be rejected on-chain; the client signs and submits
the XDR, and the contract rejects the invalid transition there.

### Implication for testing

Integration tests against these routes can assert:
- **Auth gating** — unauthenticated requests are rejected (`401`).
- **Input validation** — bad `amount` / `id` produce `400` with the
  `VALIDATION_ERROR` envelope and the validation key from
  `lib/validation/savings-goals.ts`.
- **Error propagation** — a contract-layer rejection surfaces as `500` with the
  `UNEXPECTED_ERROR` envelope.

They **cannot** assert the state-transition guards purely at the HTTP layer,
because the route does not evaluate goal state. In
`tests/integration/api/goals-lifecycle.test.ts` the invalid transitions
(withdraw-from-locked, add-to-completed, over-withdraw) are exercised by mocking
the contract builder to throw — proving the route faithfully surfaces the
on-chain rejection, and documenting that the guard lives on-chain.

> **Finding (genuine gap, not a test artifact):** there is no server-side
> pre-flight check of goal state before building these transactions. This is a
> defense-in-depth gap: a buggy or malicious client receives a valid XDR for an
> illegal transition and only learns it is invalid after signing + submitting.
> Consider adding a pre-flight `getGoal(id)` state check in the route handlers
> (reject locked-withdraw / completed-add early with `409 Conflict`) so the API
> contract matches user expectations and saves a wasted round-trip. Tracked as a
> follow-up; this change set is test-only.

## Error envelope

All goals routes use the helpers in `lib/errors/api-errors.ts`, which return:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…" } }
```

Codes in use: `VALIDATION_ERROR` (400), `AUTHENTICATION_ERROR` (401),
`UNEXPECTED_ERROR` (500). The `completed` route is the exception — it predates
the shared helpers and returns `{ error: "…" }` with `401` / `404` / `500`.

## Auth quirks worth knowing

- The two auth paths differ. `withAuth` (create/list) accepts any non-empty
  `x-user` / `x-stellar-public-key` value, whereas `getSessionFromRequest`
  (add/withdraw/lock/unlock) requires a 56-char `G…` Stellar key.
- The `completed` route only checks for the **presence** of an `x-public-key`
  header, not its format.

These inconsistencies are documented here for awareness; reconciling them is out
of scope for the test-only change that introduced this doc.
