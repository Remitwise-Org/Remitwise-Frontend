# Frontend Testing Guide

RemitWise uses a **multi-runner** test setup. This is intentional — each runner is the
right tool for a different kind of test — but it can be confusing on first contact. This
guide explains **which runner to use when**, maps every `package.json` test script to what
it runs, describes the `tests/` layout, states the coverage and gate expectations, and
gives a copy-paste recipe for adding a test with each runner.

> New here? Read [CONTRIBUTING.md](../CONTRIBUTING.md) first for branch naming and PR
> expectations, then come back here when you need to add or run tests.

---

## Table of Contents

1. [TL;DR](#tldr)
2. [The runners](#the-runners)
3. [Script map](#script-map-packagejson)
4. [Directory layout](#directory-layout-tests)
5. [Which suites need a server or database](#which-suites-need-a-server-or-database)
6. [Running a single file or test](#running-a-single-file-or-test)
7. [Coverage](#coverage)
8. [The CI gate](#the-ci-gate)
9. [How to add a test](#how-to-add-a-test)

---

## TL;DR

```bash
npm run test            # unit suites (node:test + Vitest) — the fast inner loop
npm run test:coverage   # full Vitest run with a coverage report
npm run test:property   # property-based (fast-check) tests
npm run test:integration# integration suites (node:test + Vitest)
npm run test:e2e        # Playwright end-to-end (auto-starts the dev server)
npm run lint            # ESLint
npm run build           # Next.js build — also type-checks (tsc)
```

| I want to test…                                   | Use                     | Lives in                     |
| ------------------------------------------------- | ----------------------- | ---------------------------- |
| A TypeScript function / hook / component          | **Vitest** (`.test.ts` / `.test.tsx`) | `tests/unit/`, `lib/**`, `components/**` |
| A Node-native module (crypto, raw middleware)     | **node:test** (`.test.cjs`) | `tests/unit/`            |
| A correctness property over many random inputs    | **Vitest + fast-check** | `tests/property/`            |
| An API route / error contract end to end          | **node:test** or **Vitest** | `tests/integration/`     |
| A real user flow in a browser                     | **Playwright**          | `tests/e2e/`                 |

---

## The runners

The repo uses **three** test runners. Pick by what you are testing, not by preference.

### 1. Vitest — unit, property, component, and TS integration tests

Configured in [vitest.config.mts](../vitest.config.mts). Use Vitest when you want:

- TypeScript with no manual compile step,
- the `expect` matcher API and `@testing-library/jest-dom` assertions
  (loaded by [vitest.setup.ts](../vitest.setup.ts)),
- `vi.mock` / `vi.fn` mocking,
- a `jsdom` environment (the config sets `environment: 'jsdom'`, so component and
  browser-ish code works).

Vitest discovers any file matching the `include` globs in `vitest.config.mts`
(`tests/unit/**`, `tests/property/**`, `tests/integration/**`, `tests/session/**`,
`lib/**/*.test.ts(x)`, `components/**/*.test.tsx`). That is why
[`npm run test:coverage`](#coverage) sweeps far more files than the single file named in
`test:unit:vitest`.

**Example:** [tests/unit/validation/savings-goals.test.ts](../tests/unit/validation/savings-goals.test.ts)

### 2. node:test — `.cjs` suites for Node-native modules

Some suites run on Node's built-in test runner (`node --test`) with `node:assert`. They
are plain CommonJS (`.cjs`), need no transform, and no browser environment. Use node:test
when the thing under test is Node-native — webhook signature verification (crypto), raw
middleware logic, the LRU contract cache — or when an integration test spins up real HTTP
calls without a bundler in the way.

The `.cjs` unit suites transpile the TypeScript source they import on the fly via the
`typescript` package (see the `loadVerifyModule` helper in the webhook test). If
`typescript` is not installed, those suites **skip** rather than fail.

**Example:** [tests/unit/webhooks-verify.test.cjs](../tests/unit/webhooks-verify.test.cjs)

### 3. Playwright — end-to-end browser tests

Configured in [playwright.config.ts](../playwright.config.ts). Runs real `chromium`
against the app. The config's `webServer` block **starts `npm run dev` automatically** and
waits for `http://localhost:3000`, injecting test env vars (`DATABASE_URL`,
`SESSION_PASSWORD`, etc.), so you do not have to start the server yourself. Tests live in
`tests/e2e/` (matched by `testDir`) and are named `*.spec.ts`.

**Example:** [tests/e2e/health.spec.ts](../tests/e2e/health.spec.ts)

---

## Script map (`package.json`)

Every script below is defined in [package.json](../package.json). The "Runner" column says
which engine actually executes, and "When to use it" says when to reach for it.

| Script                     | What it runs                                                                                                   | Runner            | When to use it                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| `npm test`                 | Alias for `test:unit`                                                                                           | node:test + Vitest| The default fast check before pushing.                                 |
| `npm run test:unit`        | Runs `test:unit:node` **then** `test:unit:vitest`                                                               | node:test + Vitest| Inner loop for unit changes.                                           |
| `npm run test:unit:node`   | `node --test` over `webhooks-verify.test.cjs`, `middleware.test.cjs`, `contract-cache.test.cjs`                | node:test         | You changed a Node-native module (crypto, middleware, cache).          |
| `npm run test:unit:vitest` | `vitest run tests/unit/validation/savings-goals.test.ts`                                                        | Vitest            | You changed the savings-goals validators (or copy it for a new file).  |
| `npm run test:property`    | `vitest run tests/property`                                                                                     | Vitest + fast-check| You changed validation/business logic and want random-input coverage. |
| `npm run test:integration` | `node --test` over `auth`/`health`/`validation` `.cjs` suites, **then** `vitest run` the goals API TS suite     | node:test + Vitest| You changed an API route, error contract, or auth/health behavior.     |
| `npm run test:coverage`    | `vitest run --coverage` — **all** Vitest-discovered files (see globs above)                                     | Vitest            | Before a PR, to see the full suite + coverage report.                  |
| `npm run test:watch`       | `vitest` in watch mode                                                                                          | Vitest            | Iterating on a Vitest spec.                                            |
| `npm run test:ui`          | `vitest --ui`                                                                                                   | Vitest            | Browsing results in the Vitest UI.                                     |
| `npm run test:e2e`         | `playwright test`                                                                                               | Playwright        | You changed a user-facing flow or want a full-stack smoke test.        |
| `npm run lint`             | `eslint .`                                                                                                      | ESLint            | Always, before pushing.                                                |
| `npm run build`            | `next build` (runs `tsc` as part of the build)                                                                 | Next.js / tsc     | To catch type errors — this is the type-check gate.                    |

> Note: `npm run test:unit:vitest` deliberately targets a **single** file, while
> `npm run test:coverage` runs the **whole** Vitest include set. If you add a new Vitest
> spec under a covered path, `test:coverage` will pick it up automatically; to run it in
> isolation, pass the path explicitly (see [below](#running-a-single-file-or-test)).

---

## Directory layout (`tests/`)

```
tests/
├── unit/                 # Fast, isolated tests
│   ├── *.test.ts         #   → Vitest (TypeScript units, hooks, stores)
│   ├── *.test.cjs        #   → node:test (Node-native modules)
│   └── validation/, goals/, split/, anchor/, hooks/   # grouped by feature
├── property/             # Property-based tests (Vitest + fast-check)
│   └── *.test.ts
├── integration/          # API-route / contract tests
│   ├── *.test.cjs        #   → node:test (auth, health, validation, split)
│   ├── api/*.test.ts     #   → Vitest (e.g. goals-validation)
│   ├── helpers.cjs       #   shared request/response helpers
│   └── setup.cjs         #   integration bootstrap
├── session/              # Session/auth lifecycle tests (Vitest)
│   └── *.test.ts
└── e2e/                  # Playwright browser specs
    └── *.spec.ts
```

**Where does my new test go?**

- Testing a TypeScript function, hook, store, or component in isolation →
  `tests/unit/<feature>/<name>.test.ts(x)` (Vitest). Component tests can also sit next to
  the component as `components/**/*.test.tsx`.
- Testing a Node-native module (no JSX, no TS-only types needed) →
  `tests/unit/<name>.test.cjs` (node:test), and add the path to the `test:unit:node`
  script.
- Verifying a correctness property over generated inputs → `tests/property/` (Vitest +
  fast-check).
- Exercising an API route, error shape, or auth/health behavior → `tests/integration/`
  (`.cjs` for node:test, or `api/*.test.ts` for Vitest).
- Driving a real browser flow → `tests/e2e/<flow>.spec.ts` (Playwright).

---

## Which suites need a server or database

| Suite                         | Needs a running dev server? | Needs a database?                         |
| ----------------------------- | --------------------------- | ----------------------------------------- |
| Vitest unit / property        | No                          | No                                        |
| node:test unit (`.cjs`)       | No                          | No                                        |
| Integration (`tests/integration`) | No — handlers/HTTP are exercised in-process | Yes — `DATABASE_URL` must point at a real (SQLite) DB; the DB layer is **not** mocked |
| Playwright e2e                | Auto-started by the config's `webServer` (you don't start it manually) | Yes — the config sets `DATABASE_URL=file:./ci.db` and `SESSION_PASSWORD` for the spawned server |

A minimal local env (also described in [CONTRIBUTING.md](../CONTRIBUTING.md)) is a `.env`
with `DATABASE_URL="file:./dev.db"` and a `SESSION_PASSWORD` of at least 32 characters.
Apply migrations once with `npx prisma migrate dev` before running integration/e2e suites.

---

## Running a single file or test

```bash
# Vitest — one file
npx vitest run tests/unit/validation/savings-goals.test.ts

# Vitest — only tests whose name matches a pattern
npx vitest run -t "rejects zero"

# node:test — one .cjs file
node --test tests/unit/middleware.test.cjs

# Playwright — one spec, or one test by line
npx playwright test tests/e2e/health.spec.ts
npx playwright test tests/e2e/send-flow.spec.ts:31

# Playwright — see the tests without running them
npx playwright test --list
```

---

## Coverage

```bash
npm run test:coverage
```

This runs `vitest run --coverage` over **every** file the Vitest config discovers and
prints a `text` summary to the terminal. Per
[vitest.config.mts](../vitest.config.mts), coverage uses the **v8** provider and emits
`text`, `json`, and `html` reporters. The HTML report is written to the default Vitest
location, `coverage/` (git-ignored) — open `coverage/index.html` in a browser for the
line-by-line view.

Coverage is measured over the app's source — `lib/contracts/**`, `app/**/*.ts`,
`lib/**/*.ts`, and `components/**/*.tsx` — with the test files themselves and everything
under `tests/**` excluded (see the `coverage.include` / `coverage.exclude` lists in the
config).

**Coverage expectation:** new code should ship with tests, and a PR should not *lower*
overall coverage. There is no hard numeric threshold enforced in the config today, so the
practical bar is: **cover the logic you add or change** — happy path plus the error/edge
cases — using the runner that matches the file type. Reviewers look at the coverage diff,
not just the headline percentage.

---

## The CI gate

The GitHub Actions workflows are enforcing gates: `npm ci`, lint, unit tests,
integration tests, `npx tsc --noEmit`, `npm run build`, and Playwright e2e should fail
the job when they fail. Do not add blanket `continue-on-error` to install, lint, test,
typecheck, build, or e2e steps. If a genuinely optional diagnostic step is added later,
limit `continue-on-error` to that single step and explain why in a YAML comment.

Playwright report upload is the exception: it keeps `if: always()` so failed e2e runs
still publish artifacts for debugging, but it does not hide the failed test step.
## How to add a test

A minimal recipe per runner. Copy the matching existing example, then adapt.

### Vitest unit test (`.test.ts`)

1. Create `tests/unit/<feature>/<name>.test.ts`.
2. Import from `vitest` and use path alias `@/` for app modules.

```ts
import { describe, it, expect } from 'vitest';
import { validateAmount } from '@/lib/validation/savings-goals';

describe('validateAmount', () => {
  it('rejects zero', () => {
    const result = validateAmount(0);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('goal_amount_positive');
  });
});
```

3. Run it: `npx vitest run tests/unit/<feature>/<name>.test.ts`.
   It is automatically included in `npm run test:coverage` (it matches `tests/unit/**`).

Component tests work the same way with `.test.tsx` (jsdom + `@testing-library/jest-dom`
are already set up). Model: [tests/unit/validation/savings-goals.test.ts](../tests/unit/validation/savings-goals.test.ts).

### node:test unit test (`.test.cjs`)

1. Create `tests/unit/<name>.test.cjs` using `node:test` + `node:assert/strict`.

```cjs
const test = require('node:test');
const assert = require('node:assert/strict');

test('adds CORS headers for an allowed origin', () => {
  // require/exercise the Node-native module here
  assert.equal(1 + 1, 2);
});
```

2. **Register it** by adding the path to the `test:unit:node` script in `package.json`
   (the runner only runs the files listed there):

```jsonc
"test:unit:node": "node --test tests/unit/webhooks-verify.test.cjs tests/unit/middleware.test.cjs tests/unit/contract-cache.test.cjs tests/unit/<name>.test.cjs",
```

3. Run it: `node --test tests/unit/<name>.test.cjs` (or `npm run test:unit:node`).
   Model: [tests/unit/middleware.test.cjs](../tests/unit/middleware.test.cjs).

### Property-based test (Vitest + fast-check)

1. Create `tests/property/<name>.test.ts`.

```ts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateAmount } from '@/lib/validation/savings-goals';

describe('validateAmount properties', () => {
  it('rejects every non-positive number', () => {
    fc.assert(
      fc.property(fc.integer({ max: 0 }), (n) => {
        expect(validateAmount(n).isValid).toBe(false);
      }),
    );
  });
});
```

2. Run it: `npm run test:property` (or scope with `npx vitest run tests/property/<name>.test.ts`).
   Model: [tests/property/validation-properties.test.ts](../tests/property/validation-properties.test.ts).

### Integration test

Choose the runner by file type:

- **node:test (`.cjs`)** for raw request/response or HTTP behavior — put it in
  `tests/integration/<name>.test.cjs`, reuse `tests/integration/helpers.cjs`, and add the
  path to the `test:integration` script.
- **Vitest (`.test.ts`)** for TypeScript route/error-contract assertions — put it in
  `tests/integration/api/<name>.test.ts` (already covered by the `tests/integration/**`
  Vitest globs and the `test:integration` script's `vitest run` segment).

```ts
import { describe, it, expect } from 'vitest';
import { createValidationError } from '@/lib/errors/api-errors';

describe('createValidationError', () => {
  it('returns 400 with an error body', async () => {
    const res = createValidationError('Invalid input', 'Amount must be positive');
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'Invalid input' });
  });
});
```

Run it: `npm run test:integration` (set `DATABASE_URL` first).
Model: [tests/integration/api/goals-validation.test.ts](../tests/integration/api/goals-validation.test.ts).
See also [docs/TESTING_INTEGRATION.md](TESTING_INTEGRATION.md) for the in-process
route-handler approach.

### Playwright e2e test

1. Create `tests/e2e/<flow>.spec.ts`.

```ts
import { test, expect } from '@playwright/test';

test('health endpoint reports status', async ({ request }) => {
  const res = await request.get('/api/health');
  expect([200, 503]).toContain(res.status());
  expect(await res.json()).toHaveProperty('status');
});
```

2. Run it: `npm run test:e2e` (the config starts the dev server for you) or
   `npx playwright test tests/e2e/<flow>.spec.ts`.
   Model: [tests/e2e/send-flow.spec.ts](../tests/e2e/send-flow.spec.ts).

---

## Questions?

Open a GitHub discussion or join the [RemitWise Discord](https://discord.gg/CtQuPZFMA).
</content>
</invoke>
