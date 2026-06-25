# Per-Entrypoint Authorization Matrix

Audience: **contributors**. Use this document to verify that a route's auth behaviour
matches documented intent, to find which auth mechanism to use when adding a new
route, and to answer "is this endpoint protected?" questions without reading every
handler.

## Quick Reference

| Method | Path | Required Auth | Optional Auth | Notes |
|--------|------|---------------|---------------|-------|
| `GET` | `/api/health` | — | — | Public; bypasses rate limiter |
| `GET` | `/api/v1/health` | — | — | Same as above |
| `GET,POST` | `/api/auth/nonce` | — | — | Public; accepts `GET ?address=` or `POST { publicKey }` |
| `POST` | `/api/auth/login` | — | — | Public; sets session cookie on success |
| `POST` | `/api/auth/logout` | — | — | Public; clears session cookie |
| `POST` | `/api/auth/verify` | — | — | **Stub** — returns mock JWT |
| `GET` | `/api/auth/me` | Session cookie (`remitwise_session`) | — | Returns `{ address }` or 401 |
| `POST` | `/api/auth/refresh` | Session cookie | — | Extends TTL if refresh enabled |
| `GET,POST` | `/api/insights` | — | — | Public; returns mock data |
| `GET` | `/api/dashboard` | — | Session cookie | Session soft-optional; passes `""` if missing |
| `GET` | `/api/anchor/rates` | — | — | Public; cached exchange rates |
| `GET` | `/api/metrics` | `X-Admin-Key` header (or `admin_key`/`admin_secret` cookie) | — | Admin only; compared via `crypto.timingSafeEqual` |
| `POST` | `/api/admin/cache/clear` | `X-Admin-Key` header or admin cookie | — | Admin only |
| `GET` | `/api/admin/users` | `X-Admin-Key` header or admin cookie | — | Admin only; `?limit=N` |
| `GET` | `/api/admin/audit` | `X-Admin-Key` header or admin cookie | — | Admin only |
| `GET,POST` | `/api/split` | Session cookie, `Authorization: Bearer`, or `x-user` header | — | `withAuth()` — accepts any of three strategies |
| `GET` | `/api/split/calculate` | Session cookie, Bearer, or `x-user` | — | `withAuth()`; `?amount=X` |
| `POST` | `/api/split/initialize` | Session cookie (`getSession()`) | — | Returns unsigned XDR |
| `POST` | `/api/split/update` | Session cookie (`getSession()`) | — | Returns unsigned XDR |
| `GET,POST` | `/api/goals` | Session cookie, Bearer, or `x-user` | — | `withAuth()` |
| `GET` | `/api/goals/[id]` | `x-public-key` header | — | Header presence checked; no signature validation |
| `GET` | `/api/goals/[id]/completed` | `x-public-key` header | — | Same as above |
| `POST` | `/api/goals/[id]/add` | Session cookie or header | — | `getSessionFromRequest()` |
| `POST` | `/api/goals/[id]/withdraw` | Session cookie or header | — | Same |
| `POST` | `/api/goals/[id]/lock` | Session cookie or header | — | Same |
| `POST` | `/api/goals/[id]/unlock` | Session cookie or header | — | Same |
| `GET,POST` | `/api/bills` | Session cookie, Bearer, or `x-user` | — | `withAuth()` |
| `GET` | `/api/bills/total-unpaid` | Bearer token (`AUTH_SECRET`) | — | Legacy auth; not session-based |
| `GET` | `/api/bills/[id]` | Bearer token (`AUTH_SECRET`) | — | Legacy auth |
| `GET,POST` | `/api/insurance` | — | — | GET `?owner=` param; POST Zod-only; **no auth check** |
| `GET` | `/api/insurance/[id]` | Bearer token (`AUTH_SECRET`) | — | `validateAuth()` |
| `GET` | `/api/insurance/total-premium` | Bearer token (`AUTH_SECRET`) | — | Same |
| `GET` | `/api/insurance/reminders` | Session cookie | — | `requireAuth()` |
| `GET,POST` | `/api/family` | Session cookie, Bearer, or `x-user` | — | `withAuth()`; returns stub data |
| `GET,POST` | `/api/family/members` | — | — | **501 Not Implemented** |
| `GET` | `/api/family/members/[id]` | — | — | **501 Not Implemented** |
| `GET` | `/api/family/members/[id]/check` | — | — | **501 Not Implemented** |
| `PATCH` | `/api/family/members/[id]/limit` | — | — | **501 Not Implemented** |
| `POST` | `/api/send` | Session cookie, Bearer, or `x-user` | — | `withAuth()`; placeholder |
| `GET,POST` | `/api/remittance/history` | Session cookie | — | `requireAuth()` |
| `GET,POST` | `/api/remittance/recurring` | Session cookie | — | `requireAuth()` |
| `PATCH,DELETE` | `/api/remittance/recurring/[id]` | Session cookie | — | `requireAuth()` + owner check (403 if mismatch) |
| `POST` | `/api/remittance/build` | Session cookie | — | `requireAuth()` |
| `GET` | `/api/remittance/quote` | — | — | Public; Zod validation only |
| `GET` | `/api/remittance/qoute` | — | — | Public; legacy alias of `quote` |
| `POST` | `/api/anchor/deposit` | Session cookie | — | `requireAuth()` |
| `POST` | `/api/anchor/withdraw` | Session cookie | — | `requireAuth()` |
| `GET` | `/api/cache/invalidate` | — | — | **Unprotected** — should be locked in production |
| `POST` | `/api/cache/invalidate` | — | — | Same |
| `POST` | `/api/webhooks/anchor` | HMAC-SHA256 (`x-anchor-signature`) | — | Verifies against `ANCHOR_WEBHOOK_SECRET` |
| `GET` | `/api/.well-known/openapi` | — | — | Public; OpenAPI discovery |
| `GET` | `/api/docs/spec` | — | — | Public; serves `openapi.yaml` |
| `GET` | `/api/docs` (page) | — | — | Public; Swagger UI |
| `POST` | `/api/v1/bills` | `x-user` header (valid Ed25519 key) | — | Returns unsigned XDR |
| `POST` | `/api/v1/bills/[id]/pay` | `x-user` header | — | Returns unsigned XDR |
| `POST` | `/api/v1/bills/[id]/cancel` | `x-user` header | `x-owner-only: 1` + `x-owner` | Optional owner enforcement |
| `POST` | `/api/v1/insurance` | `x-user` header | — | Returns unsigned XDR |
| `POST` | `/api/v1/insurance/[id]/pay` | `x-user` header | — | Returns unsigned XDR |
| `POST` | `/api/v1/insurance/[id]/deactivate` | `x-user` header | `x-owner-only: 1` + `x-owner` | Optional owner enforcement |
| `GET` | `/api/v1/remittance/history` | Session cookie | — | Transaction history from Horizon |
| `POST` | `/api/v1/remittance/emergency/build` | Session cookie | — | Build emergency transfer XDR |
| `POST` | `/api/v1/anchor/deposit` | Session cookie | — | `requireAuth()` |
| `POST` | `/api/v1/anchor/withdraw` | Session cookie | — | `requireAuth()` |
| `GET` | `/api/v1/anchor/rates` | — | — | Public; re-export |
| `GET` | `/api/v1/bills/due-soon` | Session cookie | — | `requireAuth()` |
| `GET,PUT` | `/api/v1/tutorials/[tutorialId]/progress` | Session cookie | — | `requireAuth()` + DB user check |
| `GET` | `/api/protected/example-require-auth` | Session cookie | — | Example route |
| `GET` | `/api/protected/example-refresh` | Session cookie | — | Example route |
| `POST` | `/api/v1/admin/cache/clear` | `X-Admin-Key` header or admin cookie | — | Admin only; emits audit event |
| `GET` | `/api/v1/admin/users` | `X-Admin-Key` header or admin cookie | — | Admin only |
| `GET` | `/api/v1/admin/audit` | `X-Admin-Key` header or admin cookie | — | Admin only |
| `POST` | `/api/v1/admin/webhooks/process` | `X-Admin-Key` header or admin cookie | — | Admin only; `?limit=N` |
| `GET` | `/api/v1/admin/webhooks/dlq` | `X-Admin-Key` header or admin cookie | — | Admin only |
| `POST` | `/api/v1/admin/webhooks/dlq/[id]/replay` | `X-Admin-Key` header or admin cookie | — | Admin only |

## Auth Mechanisms

### 1. Cookie-based session (`remitwise_session`)

Encrypted via `iron-session` (`SESSION_PASSWORD` env var). Managed in `lib/session.ts`.

- `getSession()` — returns `SessionData | null`
- `getSessionWithRefresh()` — extends TTL if `SESSION_REFRESH_ENABLED=true`
- `requireAuth()` — returns `401 Response` if no valid session
- `createSession(address)` — called by `POST /api/auth/login` after Stellar signature verification

Used by: `/api/auth/me`, `/api/auth/refresh`, `/api/user/*`, `/api/remittance/*`,
`/api/anchor/deposit`, `/api/anchor/withdraw`, `/api/v1/remittance/*`,
`/api/v1/bills/due-soon`, `/api/v1/tutorials/*`.

### 2. Multi-strategy `withAuth()` wrapper

Defined in `lib/auth.ts`. Tries three auth sources **in order**, falling through if one fails:

1. `Authorization: Bearer <token>` compared to `AUTH_SECRET`
2. `x-user` or `x-stellar-public-key` header
3. `remitwise_session` cookie via `getSession()`

Used by: `/api/split`, `/api/split/calculate`, `/api/goals`, `/api/bills`,
`/api/family`, `/api/send`.

### 3. `x-user` header (Stellar public key)

Validates that the header contains a syntactically valid Ed25519 Stellar key.
Does not verify ownership (no signature check). Used by v1 contract-build
endpoints that return unsigned XDRs for the frontend to sign and submit.

Used by: `/api/v1/bills`, `/api/v1/bills/[id]/pay`, `/api/v1/bills/[id]/cancel`,
`/api/v1/insurance`, `/api/v1/insurance/[id]/pay`, `/api/v1/insurance/[id]/deactivate`.

### 4. Admin secret (`ADMIN_SECRET`)

Checked via `lib/admin/auth.ts`. Accepts:
- `X-Admin-Key: <ADMIN_SECRET>` header
- `admin_key=<ADMIN_SECRET>` cookie
- `admin_secret=<ADMIN_SECRET>` cookie

Uses `crypto.timingSafeEqual` to prevent timing attacks.

Used by: all `/api/admin/*` and `/api/v1/admin/*` routes.

### 5. Bearer token (standalone)

Simple comparison of `Authorization: Bearer <token>` against `AUTH_SECRET`.
Used without the full `withAuth()` wrapper by a few legacy routes.

Used by: `/api/bills/total-unpaid`, `/api/bills/[id]`,
`/api/insurance/[id]`, `/api/insurance/total-premium`.

### 6. Webhook HMAC-SHA256

Verifies `x-anchor-signature` header against `ANCHOR_WEBHOOK_SECRET`.
Used only by `/api/webhooks/anchor`.

## Rate Limiting

Applied in `middleware.ts` (in-memory `lru-cache`, per-IP 60-second sliding window):

| Route Class | Limit | Window |
|-------------|-------|--------|
| `/api/auth/*` | 10 requests | 60 s |
| Write methods (POST/PUT/DELETE/PATCH) | 50 requests | 60 s |
| General reads (GET) | 100 requests | 60 s |
| `/api/health` | Unlimited | Bypassed |
| `x-playwright-test: true` (non-prod) | Unlimited | Bypassed |

## Examples

### Session cookie auth

```bash
# Login first
ADDRESS="GABCDEF123..."
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$ADDRESS\",\"message\":\"...\",\"signature\":\"...\"}" \
  -c /tmp/cookies.txt

# Use the session cookie
curl -s http://localhost:3000/api/split \
  -b /tmp/cookies.txt
```

### Bearer token auth

```bash
TOUR_SECRET="your-auth-secret"
curl -s http://localhost:3000/api/bills/total-unpaid \
  -H "Authorization: Bearer $AUTH_SECRET"
```

### `x-user` header auth

```bash
USER_KEY="GABCDEF123..."
curl -s -X POST http://localhost:3000/api/v1/bills \
  -H "Content-Type: application/json" \
  -H "x-user: $USER_KEY" \
  -d '{"name":"Rent","amount":1500,"dueDate":"2026-07-01","recurring":false}'
```

### Admin key auth

```bash
ADMIN_KEY="your-admin-secret"
curl -s http://localhost:3000/api/v1/admin/users \
  -H "X-Admin-Key: $ADMIN_KEY"
```

### Owner-only enforcement

```bash
OWNER_KEY="GABCDEF123..."
curl -s -X POST "http://localhost:3000/api/v1/bills/$BILL_ID/cancel" \
  -H "x-user: $OWNER_KEY" \
  -H "x-owner-only: 1" \
  -H "x-owner: $OWNER_KEY"
```

## Related Docs

- [API Routes](./API_ROUTES.md) — route listing and authentication overview
- [Client API layer](./client-api.md) — browser-side `apiClient` usage, session refresh, expiry UI
- [Auth Implementation](./AUTH_IMPLEMENTATION.md) — `withAuth` wrapper details
- [Auth Quick Reference](./AUTH_QUICK_REF.md) — quick classification guide
- [Session Management](./session-management.md) — session lifecycle
- [Testing Auth](./TESTING_AUTH.md) — manual curl-based auth flow testing
- [API Middleware](./API_MIDDLEWARE.md) — CORS, security headers, body size limits
