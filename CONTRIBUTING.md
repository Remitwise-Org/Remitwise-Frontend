# Contributing to RemitWise Frontend

Thank you for contributing! This guide covers everything you need to get started: branch conventions, the verified test commands, and PR expectations.

For a deeper look at how the codebase is structured, see [docs/architecture.md](docs/architecture.md).
For authenticated browser data fetching, also read [docs/client-api.md](docs/client-api.md) before adding new `fetch` calls.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Branch Naming](#branch-naming)
3. [Development Setup](#development-setup)
4. [Test Commands](#test-commands)
5. [PR Expectations](#pr-expectations)
6. [Where to Add Things](#where-to-add-things)
7. [Adding an i18n Key](#adding-an-i18n-key)

---

## Prerequisites

- Node.js 18+
- npm (or pnpm — a `pnpm-lock.yaml` is present)
- A `.env` file with at minimum `DATABASE_URL="file:./dev.db"` and `SESSION_PASSWORD` (≥32 chars)

```bash
npm install
npx prisma migrate dev
npm run dev
```

---

## Branch Naming

Follow the pattern already used in this repo:

| Type | Pattern | Example |
|------|---------|---------|
| UI/UX work | `uiux/<short-description>` | `uiux/dashboard-empty-states` |
| Feature | `feat/<short-description>` | `feat/recurring-remittance` |
| Bug fix | `fix/<short-description>` | `fix/session-expiry-redirect` |
| Docs | `docs/<short-description>` | `docs/contributing-architecture` |
| Refactor | `refactor/<short-description>` | `refactor/contract-cache-types` |

---

## Development Setup

```bash
git checkout -b <your-branch>
npm install
npx prisma migrate dev   # only needed if schema changed
npm run dev
```

---

## Test Commands

All commands below are verified against `package.json`.

### Quick reference

```bash
npm run lint              # ESLint across the whole project
npm run build             # Next.js production build (also runs tsc)
npm run test              # Alias for test:unit
npm run test:unit         # Runs BOTH node:test suites AND Vitest unit tests (see below)
npm run test:coverage     # Vitest run with coverage report
npm run test:watch        # Vitest in watch mode
npm run test:ui           # Vitest UI
npm run test:property     # Property-based tests via Vitest
npm run test:integration  # node:test integration suites + Vitest integration tests
npm run test:e2e          # Playwright end-to-end tests
```

### Two test runners in `test:unit`

`npm run test:unit` runs two sub-commands back-to-back:

```
test:unit:node    →  node --test tests/unit/webhooks-verify.test.cjs
                              tests/unit/middleware.test.cjs
                              tests/unit/contract-cache.test.cjs

test:unit:vitest  →  vitest run tests/unit/validation/savings-goals.test.ts
```

**Why two runners?** The `.cjs` suites use Node's built-in `node:test` runner because they test CommonJS-compatible modules (webhook verification, raw middleware logic, and the LRU contract-cache) that do not need a browser-like environment. The `.ts` Vitest suite handles TypeScript validation logic and benefits from Vitest's `expect` API and fast ESM transform. When adding new unit tests:

- Write `.cjs` with `node:test` / `assert` when testing a Node-native module (crypto, HTTP internals, or anything in `lib/` that has no JSX).
- Write `.ts` with Vitest when you need TypeScript types, `vi.mock`, or `expect` matchers.

### Integration tests

```bash
npm run test:integration
```

This runs:

1. `node --test tests/integration/auth.test.cjs tests/integration/health.test.cjs tests/integration/validation.test.cjs` — node:test suites that spin up real HTTP calls against a running (or in-process) server.
2. `vitest run tests/integration/api/goals-validation.test.ts` — Vitest integration tests for the goals API.

Integration tests require `DATABASE_URL` to point to a real (SQLite) database. They do **not** mock the database layer.

### End-to-end tests

```bash
npm run test:e2e   # Playwright — requires the dev server to be running
```

---

## PR Expectations

1. **Claim the issue first** — comment on the GitHub issue before starting work.
2. **One concern per PR** — keep scope tight; large PRs stall in review.
3. **Lint must pass** — run `npm run lint` locally before pushing. CI will reject lint failures.
4. **Build must pass** — run `npm run build` to catch TypeScript errors early.
5. **Tests** — add or update tests that cover your change. Prefer the existing runner for the file type (`.cjs` → node:test, `.ts` → Vitest).
6. **PR description** — summarise what changed and why. Link the issue (`Closes #NNN`).
7. **No commented-out code** — remove dead code rather than commenting it out.
8. **i18n** — any user-visible string must use the i18n system (see [Adding an i18n Key](#adding-an-i18n-key)).

Example commit message style used in this repo:

```
feat: add recurring remittance schedule UI

Implements the schedule picker and wires it to POST /api/remittance/recurring.
Closes #301
```

---

## Where to Add Things

| What you're adding | Where it lives |
|--------------------|----------------|
| New page/route | `app/<route-name>/page.tsx` (Next.js App Router) |
| Shared UI component | `components/ui/` |
| Feature-specific component | `components/<feature>/` |
| React hook | `lib/hooks/` |
| Server-side API route | `app/api/<resource>/route.ts` |
| Versioned API route | `app/api/v1/<resource>/route.ts` |
| Soroban contract read/write | `lib/contracts/<feature>.ts` |
| Cached contract reads | wrap in `lib/cache/contract-cache.ts` helpers |
| Auth/session helpers | `lib/session.ts` or `lib/auth/` |
| Database queries | `lib/db.ts` or a dedicated file under `lib/` |
| i18n strings | `lib/i18n/locales/en.json` **and** `lib/i18n/locales/es.json` |
| Type definitions | `types/` |
| Utility functions | `utils/` or a file under `lib/` |

See [docs/architecture.md](docs/architecture.md) for a full layer map.

---

## Adding an i18n Key

1. Add the key + English value to `lib/i18n/locales/en.json`.
2. Add the **same key** with a Spanish translation to `lib/i18n/locales/es.json`. Use a placeholder (`"[ES] <English text>"`) if you are not a Spanish speaker — a translator will follow up.
3. In server components or API routes, use the `getTranslator` helper from `lib/i18n/index.ts`:

   ```ts
   import { getTranslator } from '@/lib/i18n';
   const t = getTranslator(request.headers.get('accept-language'));
   t('your.new.key');
   ```

4. In client components, use the `useClientLocale` hook from `lib/i18n/client.ts`:

   ```tsx
   import { useClientLocale } from '@/lib/i18n/client';
   const { t } = useClientLocale();
   t('your.new.key');
   ```

---

## Questions?

Join the [RemitWise Discord](https://discord.gg/CtQuPZFMA) or open a discussion on GitHub.
