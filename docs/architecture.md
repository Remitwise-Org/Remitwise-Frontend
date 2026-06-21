# Frontend Architecture

This document maps the route structure, library layers, and key subsystems of the RemitWise Frontend. Read it alongside [CONTRIBUTING.md](../CONTRIBUTING.md) before making changes.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Route Map](#route-map)
3. [API Routes](#api-routes)
4. [Library Layers](#library-layers)
   - [Hooks (`lib/hooks/`)](#hooks-libhooks)
   - [Client Utilities (`lib/client/`)](#client-utilities-libclient)
   - [Contract Layer (`lib/contracts/`)](#contract-layer-libcontracts)
   - [Cache Layer (`lib/cache/`)](#cache-layer-libcache)
   - [Session & Auth (`lib/session.ts`, `lib/auth/`)](#session--auth)
5. [i18n](#i18n)
6. [Middleware (`middleware.ts`)](#middleware-middlewarets)
7. [Database & Prisma](#database--prisma)
8. [Testing Architecture](#testing-architecture)

---

## Tech Stack

| Concern | Tool |
|---------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Database | SQLite via Prisma |
| Blockchain | Stellar / Soroban (stellar-sdk) |
| Session | iron-session (encrypted cookie) |
| i18n | i18next (server) + custom hook (client) |
| Unit tests | node:test (.cjs) + Vitest (.ts) |
| E2E tests | Playwright |

---

## Route Map

All pages live under `app/` and use the Next.js App Router convention (`page.tsx` = route).

```
/                        app/page.tsx               — Landing / root redirect
/dashboard               app/dashboard/page.tsx     — Main dashboard
/dashboard/goals         app/dashboard/goals/page.tsx
/dashboard/insight       app/dashboard/insight/page.tsx
/dashboard/transaction-history  app/dashboard/transaction-history/page.tsx
/send                    app/send/page.tsx           — Send money (remittance)
/split                   app/split/page.tsx          — Smart money split
/bills                   app/bills/page.tsx          — Bill payments
/family                  app/family/page.tsx         — Family wallets
/insurance               app/insurance/page.tsx      — Micro-insurance
/transactions            app/transactions/page.tsx
/insights                app/insights/page.tsx
/financial-insight       app/financial-insight/page.tsx
/financial-insights      app/financial-insights/page.tsx
/emergency-transfer      app/emergency-transfer/page.tsx
/settings                app/settings/page.tsx
/tutorial                app/tutorial/page.tsx
/tutorial/[tutorialId]   app/tutorial/[tutorialId]/page.tsx
/tutorial/[tutorialId]/chapter/[chapterId]  app/tutorial/[tutorialId]/chapter/[chapterId]/page.tsx
```

The shared layout (`app/layout.tsx`) wraps every page with providers, fonts, and the global nav.

**Adding a new page:** create `app/<route-name>/page.tsx`. If it needs server-side auth, call `requireAuth()` from `lib/session.ts` at the top of the async server component.

---

## API Routes

Internal Next.js API routes live under `app/api/`. A versioned namespace (`app/api/v1/`) is used for endpoints consumed by external wallets or integrators.

### Auth

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Verify signed nonce and create session |
| POST | `/api/auth/logout` | Clear session cookie |
| GET  | `/api/auth/me` | Return current session address |
| GET  | `/api/auth/nonce` | Issue a nonce for wallet signing |
| POST | `/api/auth/verify` | Verify a Stellar signature |

### Dashboard & Insights

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/dashboard` | Aggregate dashboard data |
| GET | `/api/insights` | Financial insights |

### Remittance

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/remittance/build` | Build remittance transaction XDR |
| GET  | `/api/remittance/history` | Remittance history |
| POST | `/api/remittance/recurring` | Create recurring schedule |
| GET  | `/api/v1/remittance/history` | Versioned history |
| GET  | `/api/v1/remittance/status/[txHash]` | Poll transaction status |
| POST | `/api/v1/remittance/emergency/build` | Emergency transfer XDR |

### Bills

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/bills` | List / create bills |
| GET/PUT/DELETE | `/api/bills/[id]` | Single bill |
| GET | `/api/bills/total-unpaid` | Unpaid total |
| GET | `/api/v1/bills` | Versioned list |
| POST | `/api/v1/bills/[id]/pay` | Pay a bill |
| POST | `/api/v1/bills/[id]/cancel` | Cancel a bill |
| GET | `/api/v1/bills/due-soon` | Bills due within threshold |

### Savings Goals

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/goals` | List / create goals |
| GET/PUT/DELETE | `/api/goals/[id]` | Single goal |
| POST | `/api/goals/[id]/add` | Add funds |
| POST | `/api/goals/[id]/withdraw` | Withdraw funds |
| POST | `/api/goals/[id]/lock` | Lock goal |
| POST | `/api/goals/[id]/unlock` | Unlock goal |
| GET  | `/api/goals/[id]/completed` | Mark completed |

### Insurance

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/insurance` | List / create policies |
| GET/DELETE | `/api/insurance/[id]` | Single policy |
| GET | `/api/insurance/total-premium` | Total premiums |
| GET | `/api/insurance/reminders` | Upcoming renewals |
| POST | `/api/v1/insurance/[id]/pay` | Pay premium (returns XDR) |
| POST | `/api/v1/insurance/[id]/deactivate` | Deactivate policy (returns XDR) |

### Family Wallets

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/family` | Family overview |
| GET/POST | `/api/family/members` | List / add members |
| GET/PUT/DELETE | `/api/family/members/[id]` | Single member |
| PUT | `/api/family/members/[id]/limit` | Update spending limit |
| GET | `/api/family/members/[id]/check` | Check spending allowance |

### Send / Split

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/send` | Submit send transaction |
| GET/POST | `/api/split` | Split config |
| POST | `/api/split/calculate` | Calculate split amounts |
| POST | `/api/split/initialize` | Initialise split state |
| PUT  | `/api/split/update` | Update split percentages |

### User

| Method | Path | Purpose |
|--------|------|---------|
| GET/PUT | `/api/user/profile` | User profile |
| GET/PUT | `/api/user/preferences` | User preferences |

### Anchor (Stellar SEP)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/anchor/deposit` | Initiate deposit |
| POST | `/api/anchor/withdraw` | Initiate withdrawal |
| GET  | `/api/anchor/rates` | Exchange rates |
| (v1 mirrors of the above) | `/api/v1/anchor/*` | |

### Admin

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/audit` | Audit log |
| POST | `/api/admin/cache/clear` | Clear server cache |
| (v1 mirrors + webhook DLQ) | `/api/v1/admin/*` | |

### Webhooks & Discovery

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/webhooks/anchor` | Anchor webhook receiver |
| GET  | `/api/.well-known/openapi` | OpenAPI spec redirect |
| GET  | `/api/docs/spec` | Serve `openapi.yaml` |
| GET  | `/api/health` | Health check |
| GET  | `/api/metrics` | Prometheus-style metrics |

---

## Library Layers

### Hooks (`lib/hooks/`)

Client-side React hooks. These run in the browser (all files have `"use client"` or are imported only from client components).

| File | Export | Purpose |
|------|--------|---------|
| `useFormAction.ts` | `useFormAction<T>(url, method)` | Generic form submission hook that wraps `fetch` in a React `useTransition`. Returns `[state, formAction, isPending]`. Use this whenever a component submits data to an API route via `FormData`. |
| `useSessionExpiry.ts` | `useSessionExpiry` (via `lib/client/`) | Detects 401 responses and triggers a redirect to re-authenticate. |

**When to add a hook:** extract shared stateful logic that is needed by two or more client components. One-off component state stays inside the component.

### Client Utilities (`lib/client/`)

Browser-safe helpers imported from client components and hooks.

| File | Purpose |
|------|---------|
| `apiClient.ts` | Thin `fetch` wrapper (`apiClient.get/post/put/delete`) that detects session expiry (HTTP 401) and delegates to `sessionHandler` to redirect the user. Use this in client components instead of raw `fetch` for any authenticated request. |
| `sessionHandler.ts` | Reads `sessionHandler.isSessionExpired(response)` and calls `sessionHandler.handleSessionExpiry(currentPath)`. Imported by `apiClient`. |
| `logout.ts` | Calls `POST /api/auth/logout` and clears local state. |

### Contract Layer (`lib/contracts/`)

Soroban smart-contract integration. Each file corresponds to one deployed contract.

| File | Contract | Key exports |
|------|----------|-------------|
| `savings-goal.ts` | Savings Goals | `getSavingsGoal`, `getAllGoals`, `buildAddFundsTx`, `buildWithdrawTx`, `buildLockTx` |
| `bill-payments.ts` | Bill Payments | `buildPayBillTx`, `buildCreateBillTx` |
| `remittance-split.ts` | Remittance Split | `buildSplitTx`, `calculateSplit` |
| `insurance.ts` | Insurance | `buildCreatePolicyTx`, `buildPayPremiumTx`, `buildDeactivateTx` |
| `family-wallet.ts` | Family Wallet | `getMember`, `getAllMembers`, `buildAddMemberTx`, `buildUpdateSpendingLimitTx`, `checkSpendingLimit` |
| `network-resolution.ts` | — | `resolveContractId(name)` — reads contract IDs from env vars based on `SOROBAN_NETWORK` |
| `dashboard-aggregate.ts` | — | Aggregates reads from multiple contracts for the dashboard |
| `insurance-cached.ts` | — | Insurance reads wrapped with the cache layer |
| `remittance-split-cached.ts` | — | Split reads wrapped with the cache layer |

**Contract ID resolution:** `resolveContractId("SAVINGS_GOALS")` reads `SAVINGS_GOALS_CONTRACT_ID_TESTNET` or `SAVINGS_GOALS_CONTRACT_ID_MAINNET` (depending on `SOROBAN_NETWORK`). You can also set `CONTRACT_IDS_JSON` as a single JSON blob keyed by network.

**Adding a new contract:** create `lib/contracts/<feature>.ts`, import `resolveContractId` from `network-resolution.ts`, and export typed build/read functions. Read functions that are called frequently should be wrapped with the cache layer (see below).

### Cache Layer (`lib/cache/`)

LRU in-memory cache for Soroban contract **read** operations (writes always go straight to the network).

| File | Purpose |
|------|---------|
| `contract-cache.ts` | `ContractCache` class with `get`, `set`, `invalidate`, `getStats`. Implements TTL eviction, input validation, and DoS protection (max key length, max entry count). |
| `registry.ts` | Pre-configured cache instances for each contract domain. Import the named instance (e.g. `savingsGoalCache`) rather than constructing your own. |

**When to add a cached read:** if a contract read is called on every page load or from multiple components, add a cache wrapper in `lib/contracts/<feature>-cached.ts` that checks the registry cache before calling the RPC node. Never cache writes or reads that must be real-time (e.g. spending-limit checks before a transaction).

**Invalidation:** call `POST /api/admin/cache/clear` (admin only) or `POST /api/cache/invalidate` to bust the server-side cache after a write.

### Session & Auth

| File | Purpose |
|------|---------|
| `lib/session.ts` | `requireAuth()` — throws a 401 Response if no valid session. `getSessionWithRefresh()` — returns session or null. Uses iron-session with an encrypted cookie keyed by `SESSION_PASSWORD`. |
| `lib/auth/` | Middleware helpers, action-state types, and fetch wrappers used by server actions. |
| `lib/client/sessionHandler.ts` | Client-side detection of expired sessions (401 responses). |

**Auth flow:**
1. Wallet signs a nonce from `GET /api/auth/nonce`.
2. Frontend posts signature to `POST /api/auth/login`.
3. Server verifies the Stellar signature and sets an iron-session cookie.
4. Subsequent API calls carry the cookie; server routes call `requireAuth()` to validate.
5. On 401, `apiClient` calls `sessionHandler.handleSessionExpiry()` which redirects to login.

---

## i18n

Supported locales: **English (`en`)** and **Spanish (`es`)**.

| File | Role |
|------|------|
| `lib/i18n/locales/en.json` | English strings (source of truth) |
| `lib/i18n/locales/es.json` | Spanish translations |
| `lib/i18n/index.ts` | `getTranslator(acceptLanguageHeader)` — server-side helper, reads `Accept-Language` header |
| `lib/i18n/client.ts` | `useClientLocale()` hook — client-side, reads `navigator.language` |

Both files must stay in sync. When adding a key, add it to `en.json` first, then add the same key to `es.json`. See [CONTRIBUTING.md — Adding an i18n Key](../CONTRIBUTING.md#adding-an-i18n-key).

---

## Middleware (`middleware.ts`)

The Next.js middleware runs on every request before routing. It handles:

- **CORS** — allowed origins are configured via the `ALLOWED_ORIGINS` env var (comma-separated list).
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`.
- **Request body size limit** — default 1 MB, overridden by `API_MAX_BODY_SIZE`.
- **Request logging** — structured logs via `lib/logger.ts` with a per-request ID from `lib/requestId.ts`.
- **Metrics** — in-memory request/error counters exposed at `GET /api/metrics`.

The middleware does **not** perform auth checks; auth is enforced inside each route handler via `requireAuth()`.

---

## Database & Prisma

Schema: `prisma/schema.prisma`. Client: `lib/prisma.ts` (singleton with connection pooling tuned for serverless).

```bash
npx prisma migrate dev      # apply pending migrations
npx prisma studio           # browse data locally
```

Database access belongs in API route handlers or server components only — never import `lib/prisma.ts` from client code.

---

## Testing Architecture

See [CONTRIBUTING.md — Test Commands](../CONTRIBUTING.md#test-commands) for the exact commands. This section explains the structure.

```
tests/
├── unit/
│   ├── webhooks-verify.test.cjs     # node:test — webhook HMAC verification
│   ├── middleware.test.cjs          # node:test — raw middleware logic
│   ├── contract-cache.test.cjs      # node:test — LRU cache behaviour
│   ├── contract-cache.test.ts       # Vitest mirror (TypeScript types)
│   ├── sanitize.test.ts             # Vitest — input sanitisation
│   ├── cached-wrappers.test.ts      # Vitest — cached contract read wrappers
│   └── validation/
│       └── savings-goals.test.ts    # Vitest — savings-goal schema validation
├── integration/
│   ├── auth.test.cjs                # node:test — auth flow against real DB
│   ├── health.test.cjs              # node:test — health endpoint
│   ├── validation.test.cjs          # node:test — input validation
│   ├── split.test.cjs               # node:test — split calculations
│   └── api/
│       └── goals-validation.test.ts # Vitest — goals API validation
├── property/                        # Vitest property-based tests
├── session/                         # Session handling tests
└── e2e/                             # Playwright specs
    ├── auth.spec.ts
    ├── health.spec.ts
    ├── remittance-api.spec.ts
    └── responsive-split-savings.spec.ts
```

### node:test vs Vitest

| Concern | Use `node:test` (`.cjs`) | Use Vitest (`.ts`) |
|---------|--------------------------|-------------------|
| File extension | `.cjs` | `.ts` |
| Run via | `node --test <files>` | `vitest run <files>` |
| Best for | Node built-ins, crypto, raw HTTP | TypeScript, React, `vi.mock`, `expect` |
| Examples in this repo | Webhook HMAC, raw middleware, LRU cache | Validation schemas, cached wrappers, savings-goal logic |

Both runners are exercised by `npm run test:unit` and `npm run test:integration`. New tests should follow the convention of the directory they're added to.
