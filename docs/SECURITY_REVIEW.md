# Security Review Checklist

Checklist for reviewers before approving security-sensitive PRs. Not every item applies to every change — use judgment to scope the review proportionally to the risk.

## Audience

**Contributors** reviewing PRs that touch authentication, session management, API security, PII handling, admin routes, environment secrets, contract interactions, or the middleware layer.

---

## 1. Authentication & Session Management

- [ ] Nonce generation uses a CSPRNG (`crypto.randomBytes` or `webcrypto.getRandomValues`)
- [ ] Nonces are single-use and expire after a reasonable TTL (default: 5 minutes)
- [ ] Signature verification uses `@stellar/stellar-sdk` `Keypair.verify()` — never naive equality
- [ ] Session tokens are HTTP-only, Secure, SameSite=Lax (or Strict) cookies
- [ ] Session expiry is enforced server-side, not just client-side
- [ ] Logout invalidates the session server-side (deletes cookie + clears server state)
- [ ] `x-user` header on write endpoints is validated as a valid Stellar public key (`G[A-Z2-7]{55}`)
- [ ] No session data is leaked in error responses or logs

Relevant files: `lib/auth.ts`, `app/api/auth/*`, `middleware.ts`

## 2. API Security (Middleware)

- [ ] CORS `Access-Control-Allow-Origin` does not reflect arbitrary origins in production
- [ ] Security headers applied to all API responses: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Vary: Origin`
- [ ] Request body size limit enforced (default 1 MB) with 413 response on oversized payloads
- [ ] Rate limiting is scoped per-IP (and per-session for authenticated routes)
- [ ] Auth endpoints rate-limited more aggressively (10 req/min) than general endpoints
- [ ] `/api/health` and Playwright test routes are exempt from auth but not from rate limiting (unless intentional)
- [ ] No sensitive data in error responses (stack traces, internal paths)

Relevant files: `middleware.ts`, `app/api/middleware/*`

## 3. Admin Routes

- [ ] All `/api/admin/*` routes require `ADMIN_SECRET` — verified via header or cookie
- [ ] `ADMIN_SECRET` is not hardcoded, not committed, not logged
- [ ] Admin responses do not include the secret in any output
- [ ] Admin endpoints follow least-privilege: read-only unless write is explicitly needed

Relevant files: `app/api/admin/*`

## 4. PII & Data Handling

- [ ] Sentry PII scrubbing is active for the affected runtime (client / server / edge)
  - Stellar public keys (`G[A-Z2-7]{55}`) are redacted
  - Amount strings (`\d+ (XLM|USDC|USD)`) are redacted
  - Server runtime also redacts `iron-session` tokens
- [ ] No plaintext secrets in Sentry breadcrumbs or extra event data
- [ ] No personally identifiable information (names, emails, addresses) is logged or sent to external services without explicit scrubbing

Relevant files: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`

## 5. Environment & Secrets

- [ ] New environment variables are documented in `.env.example`
- [ ] New environment variables are not logged, exposed to the client, or committed as defaults
- [ ] `NEXT_PUBLIC_*` prefix is used only for values that are safe to expose to the browser
- [ ] `ADMIN_SECRET`, `AUTH_SECRET`, `SENTRY_AUTH_TOKEN`, and API keys are stored only in CI secrets / `.env.local` — never in the repo

## 6. Contract & Transaction Security

- [ ] Transaction XDRs are built server-side; the client only signs and submits
- [ ] XDR operations use `manageData` or Soroban contract invocations — never raw `PaymentOp` without validation
- [ ] Contract IDs are resolved per-network (testnet vs. mainnet) and never hardcoded in client bundles
- [ ] Owner-only enforcement (`x-owner-only` / `x-owner` headers) is validated server-side, not trusted from the client
- [ ] Input validation on amount fields: `> 0`, finite, within reasonable bounds

Relevant files: `app/api/bills/*`, `app/api/insurance/*`, `app/api/contracts/*`, `lib/contracts/*`

## 7. Dependency & Supply Chain

- [ ] New npm dependencies are not added without team review
- [ ] Dependency version ranges are pinned (no `^` or `~` for runtime deps) or locked via `package-lock.json`
- [ ] No `eval()`, `new Function()`, or dynamic `require()` with user-controlled input
- [ ] No unnecessary `fs` or `child_process` usage in serverless routes

## 8. Regression Testing

Run these commands for the affected crate / area:

```bash
# TypeScript check
npx tsc --noEmit

# Lint
npm run lint

# Unit tests (affected area)
npm run test:unit:vitest -- --related=<changed-files>

# Integration tests
npm run test:integration

# Build (verifies no dead code or missing exports)
npm run build
```

- [ ] TypeScript compiles without errors
- [ ] Lint passes with zero warnings
- [ ] Existing tests pass (no regressions)
- [ ] New security-sensitive code has dedicated test coverage

## Sign-Off

- [ ] All applicable items above are checked (items may be N/A if justified)
- [ ] No secrets or credentials are exposed by this change
- [ ] Auth, session, and PII handling follow existing patterns (not ad-hoc)
- [ ] PR description explains the security rationale for the change

**Reviewer:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Approval:** [ ] Approved  [ ] Needs Changes  [ ] Rejected
