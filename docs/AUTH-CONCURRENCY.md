# Auth flow concurrency & race safety (issue #1689)

**Scope:** `meridian-api/src/auth` — sign-in, refresh, email verification,
verification resend (recovery), logout and logout-all across **expiry,
retries, multiple tabs and device changes**.

This document is the reviewable contract: what is serialized where, what the
client retry contract is, which behaviors changed, and how the guarantees are
tested.

---

## 1. Threat model and invariants

| #    | Invariant                                                                                       | Enforced by                                                            |
| ---- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| I1   | At most **one live descendant** per refresh token. Two requests presenting the same live token cannot both rotate it. | Transactional compare-and-set (CAS) revoke: `UPDATE refresh_tokens SET revoked_at = now WHERE jti = ? AND revoked_at IS NULL AND expires_at > now` inside the same transaction that inserts the replacement. Zero affected rows ⇒ the whole transaction (including the new row) rolls back and the loser gets a deterministic 401. |
| I2   | A failed rotation leaves the **old token usable**.                                              | New token is generated and persisted *before* the CAS revoke (create-before-revoke, retained from #1688), all inside one DB transaction. Any failure ⇒ rollback; nothing was revoked, nothing was minted. |
| I3   | `logoutAll` **cannot be raced** by an in-flight rotation (no write-skew).                        | Both `refreshToken` and `logoutAll` take a per-user, transaction-scoped PostgreSQL advisory lock (`pg_advisory_xact_lock(1689, userId)`) before touching rows. The two operations are fully serialized per user. |
| I4   | Logout is **idempotent**.                                                                        | Revoking an already-revoked / unknown token affects zero rows and still returns success. Retried or multi-tab logouts never fail and never touch other sessions. |
| I5   | Audit is **fire-and-forget** and never inside the rotation transaction.                          | Audit writes happen after commit with `.catch(() => {})`. An audit outage cannot fail or delay auth. |
| I6   | A verification token is consumed **exactly once**; a verified account can never hold a live verification token. | CAS consume: the flip to `emailVerified = true` only matches while the row still carries the exact token material that was read+matched. Resends only arm a token via CAS on `emailVerified = false`. |
| I7   | One `Idempotency-Key` = **one effect** per flow.                                                 | `IdempotencyProvider` (per-key mutex + durable record): concurrent same-key requests share one execution and one response; retries replay the stored result; same key + different payload ⇒ 409 with zero state change; failed executions are retriable. Keys are namespaced per flow (`sign-in:…`, `refresh-token:…`, …). |

## 2. Serialization matrix

| Concurrent pair                                  | Who wins                                | Loser observes                                            | Final state                                        |
| ------------------------------------------------ | --------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| refresh ∥ refresh (same token, no key)           | exactly one (DB CAS + advisory lock)    | 401 `Refresh token has been revoked or expired`           | 1 new live row, old revoked, no orphans            |
| refresh ∥ refresh (same token, same key)         | single shared execution                 | identical replayed response (no second rotation)           | 1 new live row                                     |
| refresh ∥ logout (same token)                    | either; both orders safe                | if logout lands first: refresh 401, no row minted          | old revoked; ≤1 live row                           |
| refresh ∥ logoutAll                              | serialized by advisory lock             | whichever runs second sees fully-committed state           | **0 live rows** after logoutAll completes          |
| logout ∥ logout (repeats)                        | all "win" (idempotent)                  | success every time                                         | revoked once                                       |
| verifyEmail ∥ verifyEmail (same token)           | one CAS flip                            | idempotent success (reads the verified row)                | verified once, one audit entry                     |
| verifyEmail ∥ resend                             | either; both orders safe                | superseded token ⇒ 401; late resend ⇒ no mail, no token    | never "verified + live token"                      |
| sign-in ∥ sign-in (same credentials, same key)   | single shared execution                 | replayed response (no second session minted)               | one session                                        |

## 3. Client retry contract

Send `Idempotency-Key: <opaque ≤255 chars>` (alias `X-Idempotency-Key`) on
`POST /auth/sign-in | refresh-token | logout | logout-all | resend-verification`.

| Response | Meaning                                  | Client action                                            |
| -------- | ---------------------------------------- | -------------------------------------------------------- |
| 2xx      | effect applied (or replayed)             | store the response; a retry with the same key replays it  |
| 409      | key reused with a different body         | generate a new key; nothing was executed                  |
| 400      | malformed key (empty / >255 chars)       | fix the header                                            |
| 401 on refresh | token consumed/revoked/expired     | **do not retry with the same token** — use the response obtained by the winning tab or re-authenticate |
| 5xx      | transient infra failure                  | safe to retry; the token was NOT consumed (I2); reuse the same key |

`POST /auth/verify-email` needs no header: the token itself is the (hashed)
idempotency key.

**Multi-tab guidance:** one tab should own rotation (single-flight) or every
tab should send the same `Idempotency-Key` per rotation attempt — concurrent
same-key rotations then share one response instead of the loser receiving 401.

## 4. Behavior and compatibility changes (explicit)

1. **Endpoint behavior is unchanged when no header is sent.** All response
   shapes (`{access_token, refresh_token, refreshTokenId}`, logout messages,
   verify-email body, resend acknowledgement) are preserved.
2. **401 bodies no longer echo internal error strings.** Refresh/logout
   verification failures now return fixed messages
   (`Invalid refresh token`, `Refresh token has been revoked or expired`,
   `Invalid refresh token payload`) instead of leaking e.g. `jwt expired` —
   removes a token-state enumeration oracle. Status codes unchanged.
3. **Transient infra failures are 5xx, not 401.** Previously every error in
   refresh was wrapped in `UnauthorizedException`, forcing legitimate users
   to re-authenticate after a DB blip. Now only authorization failures are
   401; generation/persistence failures propagate as 500 so clients retry.
   Required by the retry contract; covered by updated regression tests.
4. **401 on a lost rotation race is new** (previously both concurrent
   rotations could succeed — the race being fixed). Deterministic message,
   documented for clients.
5. **`POST /auth/refresh-token` runtime fix.** The pre-change code persisted
   the rotated token twice (once inside `GenerateTokenProvider.generateTokens`
   and once in `RefreshTokenProvider.refreshToken`) with the same unique
   `jti`, so every refresh failed on the unique constraint. The rotation now
   persists exactly one row and returns its id.
6. **Removed dead code:** `AuthIdempotencyInterceptor` + `AuthIdempotencyKey`
   entity (in `auth.module.ts`) never compiled (`@nestj/common`, `read only`,
   `wtConfig`, `TypeORMModule` typos) and no `auth_idempotency_keys` migration
   ever existed, so nothing could have depended on them at runtime. Their
   responsibility moved to `IdempotencyProvider` (which additionally replays
   responses instead of blindly 409-ing retries).

### Migration / rollback

- **Required migration:** `1787400000000-add-auth-audit-actions.ts` adds the
  seven auth lifecycle values to the `audit_logs_action_enum` PG enum
  (`IF NOT EXISTS`, idempotent). Without it, first audit write fails — but
  note audit failures are non-blocking (I5) for auth responses.
- **No schema change** to `refresh_tokens` / `users`: the CAS uses existing
  columns (`revoked_at`, `expires_at`, `email_verification_token`,
  `encrypted_data`).
- **Rollback:** revert the code; the added enum values are additive and inert
  for old code paths (PG cannot drop enum values; same stance as migration
  1787300000000).

## 5. Security assumptions and operational limitations

- **PostgreSQL is the concurrency substrate.** Correctness relies on
  row-level `UPDATE` visibility (Read Committed is sufficient) and
  `pg_advisory_xact_lock`. On MySQL, advisory-lock SQL differs (a
  `GET_LOCK`-based shim would be needed) — the deployment target here is PG
  (see `src/database/data-source.ts`).
- **Idempotency store is process-local** (`InMemoryIdempotencyStore`). Behind
  >1 API replica, same-key requests may hit different processes and execute
  once per process. The store interface is provided for a Redis-backed
  implementation; per-flow DB CAS (I1/I6) still bounds the *state* damage to
  one effect per token regardless. Horizonal scale-out = swap the store, no
  call-site changes.
- **Strict rotation, no reuse grace window.** A stolen-token replay gets 401
  (and kills the thief's access only by revocation-on-first-use semantics).
  Token-family revocation on detected reuse is deliberately out of scope.
- **TTLs:** idempotency records 15 min (provider default); verification tokens
  per `VERIFICATION_TTL_MS`; refresh tokens per JWT config.
- Audit log is best-effort; security monitoring should not assume 1:1
  audit-to-action correspondence under audit-store outages.

## 6. Test evidence (deterministic, no timing)

All in `meridian-api` (`npm test`):

- `src/auth/providers/auth-race.spec.ts` — 23 tests. Real providers over an
  in-memory store that implements the exact SQL semantics relied upon
  (affected-row CAS, Read-Committed transaction visibility, transaction-scoped
  advisory locks). Covers: 8-way parallel rotations, lock-parked losers,
  rollback-then-retry, logoutAll write-skew prevention (loser provably parked
  on the lock), logout storms, CAS-lost-to-logout interleaving, expiry,
  ownership mismatches, idempotent replay/conflict/retryable-failure at the
  service boundary, verification double-spend, resend-vs-verify in both
  orders. Every test asserts **final table state**.
- `src/auth/providers/idempotency.provider.spec.ts` — 11 tests on the
  concurrency core (dedup, replay, conflict, retryable failures, TTL expiry,
  key isolation).
- `src/auth/providers/refreshToken.provider.spec.ts`, `verify-email.provider.spec.ts`,
  `auth.service.spec.ts`, `auth.controller.spec.ts` — unit + HTTP-boundary
  coverage of the new call shapes, header forwarding, 400/409/401 mapping,
  and the pre-existing rollback regressions (updated, intent preserved).

## 7. Files

- `src/auth/providers/refreshToken.provider.ts` — transactional rotation + CAS + advisory lock
- `src/auth/providers/token.provider.ts` — transaction-aware persistence, returns the row id
- `src/auth/providers/verify-email.provider.ts` — CAS consume + conditional (re)arm
- `src/auth/providers/auth.service.ts` — `IdempotencyProvider` boundary, key validation/namespacing
- `src/auth/auth.controller.ts` — optional `Idempotency-Key` header, documented contract
- `src/auth/auth.module.ts` — restored (was syntactically broken), registers `IdempotencyProvider`
- `src/audit/audit-log.entity.ts` + `src/database/migrations/1787400000000-add-auth-audit-actions.ts`
- `src/auth/testing/in-memory-auth-store.ts` — deterministic SQL-semantics test double
