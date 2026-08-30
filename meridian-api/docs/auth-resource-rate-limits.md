# Auth Resource and Rate Limits — Issue #1651

## Summary

This change adds production-grade resource and rate limits to all authentication
and account-recovery flows so the system provides a deterministic, reviewable
guarantee under normal, invalid, repeated, concurrent, and failure conditions.

## What changed

### 1. Account lockout for failed sign-in attempts (`AccountLockoutService`)

**File:** `src/auth/providers/account-lockout.service.ts`

Tracks per-email failed sign-in attempts using a bounded in-memory store.
After `maxAttempts` failures (default: 5) within a configurable window
(default: 15 min), the account is locked for `lockoutMs` (default: 15 min).

**New env vars:**
| Variable | Default | Description |
|---|---|---|
| `AUTH_LOCKOUT_MAX_ATTEMPTS` | `5` | Consecutive failures before lockout |
| `AUTH_LOCKOUT_WINDOW_MS` | `900000` (15 min) | Window for counting failures |
| `AUTH_LOCKOUT_DURATION_MS` | `900000` (15 min) | How long the account is locked |

**Integration:** `SignInProviders.SignIn()` now checks lockout *before* querying
the database, records failures on wrong passwords, and resets the counter on
success. Lockout returns HTTP 429 with a `RetryAfter` guidance in the message.

### 2. Rate limiting on logout/logout-all endpoints

**File:** `src/auth/auth.controller.ts`

Added `@Throttle` decorators:
- `POST /auth/logout` → 10 requests/minute
- `POST /auth/logout-all` → 5 requests/minute

These complement the existing limits on sign-in (5/15s), refresh-token (10/60s),
verify-email (10/60s), and resend-verification (3/60s).

### 3. Input size bounds on auth DTOs

Added `@MaxLength` and `@MinLength` validators to all auth DTOs to reject
oversized payloads before expensive operations:

| DTO | Field | Max Length | Rationale |
|---|---|---|---|
| `SignInDto` | `email` | 254 | RFC 5321 §4.5.3.1 |
| `SignInDto` | `password` | 72 | bcrypt truncation limit |
| `RefreshTokenDto` | `refreshToken` | 4096 | JWT with RSA-4096 + claims |
| `LogoutDto` | `refreshToken` | 4096 | Same as above |
| `VerifyEmailDto` | `token` | 256 | 64-char hex + safety margin |
| `ResendVerificationDto` | `email` | 254 | RFC 5321 §4.5.3.1 |

### 4. Missing `AuditAction` enum values

Added auth-flow action values (`SIGN_IN`, `REFRESH`, `LOGOUT`, `LOGOUT_ALL`,
`ISSUE_VERIFICATION_TOKEN`, `VERIFY_EMAIL`, `RESEND_VERIFICATION`) to the
`AuditAction` enum so the auth module compiles correctly.

## Security invariants

1. **Stale tokens rejected** — expired or revoked tokens never advance to an
   authoritative state (existing, verified by existing tests).
2. **Account lockout is time-bounded** — after `lockoutMs` the counter resets
   automatically; no manual intervention required.
3. **Lockout counter resets on success** — a successful sign-in immediately
   clears the failure counter.
4. **Partial state on failure** — failed sign-in attempts with lockout leave no
   unauthorized or partial state (no tokens issued, no sessions created).
5. **Bounded store** — the lockout store is capped at 10,000 entries with
   LRU-style eviction to prevent OOM under sustained attack.
6. **Input validation before work** — oversized payloads are rejected by
   `class-validator` before any database query or hash computation.
7. **Rate limits cover all mutating endpoints** — sign-in, refresh, logout,
   logout-all, verify-email, and resend-verification are all throttled.
8. **Rejected operations leave no state** — idempotency keys are deleted on
   failure, lockout entries expire, and rate limit windows slide.

## Failure behavior and compatibility

- **HTTP 429 responses** now returned when:
  - An account is locked (with message indicating retry time)
  - Rate limits exceeded on any auth endpoint
- **HTTP 400 responses** now returned when:
  - Input exceeds max length bounds (e.g., email > 254 chars)
- **Public behavior preserved** — all existing successful-path responses are
  unchanged. The only new error codes are 429 (lockout/throttle) and tighter
  400 validation.

## Migration / rollback

- **Env vars** — all new env vars have safe defaults; no migration required.
- **Rollback** — revert the branch. The lockout service is additive and only
  injected into `SignInProviders`. The throttler decorators are metadata-only.
- **Database** — no schema changes. Lockout state is in-memory.

## Operational limitations

- **Single-process only** — the `AccountLockoutService` uses an in-memory store.
  For horizontal scaling, replace with Redis-backed storage (the infrastructure
  already exists in `RateLimitService`).
- **Lockout is per-email** — if the same email is used across environments, each
  process maintains independent counters.
- **Not a substitute for CAPTCHA** — lockout slows brute-force but does not
  replace bot-detection measures.

## Security assumptions

- The email is the sole lockout key (matching the sign-in identifier).
- The `ConfigService` values are trusted (set by ops, not user input).
- The process clock is monotonic (lockout expiry depends on `Date.now()`).
- The 10,000-entry cap is sufficient for legitimate traffic; extreme abuse is
  handled at the infrastructure layer (WAF, CDN rate limiting).
