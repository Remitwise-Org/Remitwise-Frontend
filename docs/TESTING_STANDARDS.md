# Testing Standards

This document establishes the testing standards, expectations, and practices for all contributors to the **RemitWise Frontend** project. 

If you are contributing code, features, or bug fixes to this repository, follow these standards to ensure your pull request (PR) passes code review and CI checks seamlessly.

---

## Purpose

Testing is a critical requirement for all code contributions to RemitWise. Thorough testing:

- **Prevents Regressions:** Ensures new code doesn't break existing functionality across financial workflows, user authentication, and transaction handling.
- **Ensures Reliability:** Verifies business logic, validation schemas, API contracts, and user interface states work accurately.
- **Facilitates Confident Refactoring:** Enables code updates and optimizations without fear of unexpected side effects.
- **Serves as Living Documentation:** Clearly demonstrates how functions, components, hooks, and API endpoints are intended to operate.

---

## Testing Pyramid

RemitWise organizes tests into a standard testing pyramid across three primary tiers, plus specialized property-based testing. Each tier addresses a specific level of system interaction:

```
        / \
       /   \        End-to-End (E2E) Tests
      / E2E \       Playwright (Browser & Flows)
     /-------\
    /         \     Integration Tests
   / Integration \  node:test & Vitest (API routes, DB & Contracts)
  /---------------\
 /                 \  Unit & Property Tests
/   Unit & Property \ Vitest & node:test + fast-check (Functions, Hooks, UI)
---------------------
```

### 1. Unit Tests

- **What they test:** Isolated functions, utility helpers, validation logic, custom React hooks, state management, and individual UI components.
- **Tools:** [Vitest](https://vitest.dev/) (for TypeScript/JSX components using `jsdom`) and Node's native test runner `node:test` (for CommonJS `.cjs` modules).
- **When to write them:** 
  - Every time you create or modify a pure function, validation schema, format utility, or calculation logic.
  - When creating or updating reusable React components (`components/**/*.tsx`).
  - When adding or modifying custom hooks (`lib/hooks/**`).
- **Characteristics:** Fast execution (milliseconds), completely isolated, and requiring no external services, running server, or database connection.

### 2. Integration Tests

- **What they test:** Interactions between multiple modules, Next.js API route handlers, authentication flows, error contract validation, and database operations.
- **Tools:** `node:test` (CommonJS suites) and Vitest (TypeScript API suites) in `tests/integration/`.
- **When to write them:**
  - When introducing or altering Next.js API routes (`app/api/**`).
  - When modifying authentication middleware, session handling, or contract caching.
  - When changing payload formats, validation responses, or database access patterns.
- **Characteristics:** Exercises handler logic with realistic requests/responses. Requires a database connection (`DATABASE_URL="file:./dev.db"` or `ci.db`).

### 3. End-to-End (E2E) Tests

- **What they test:** Complete, critical user journeys in a real browser (Chromium) from the user's perspective (e.g., login, remittance transfers, bill payments, dark mode toggle, responsive viewports).
- **Tools:** [Playwright](https://playwright.dev/) (`tests/e2e/*.spec.ts`).
- **When to write them:**
  - When introducing major new user flows or page-level features.
  - When altering core user navigation or visual UI layouts requiring visual regression testing.
- **Characteristics:** Executes against a live running dev server. Uses real DOM interactions, page navigation, and simulated network state.

### 4. Property-Based Tests (Specialized)

- **What they test:** Correctness properties across randomized input distributions to discover unhandled edge cases.
- **Tools:** Vitest + `fast-check` (`tests/property/*.test.ts`).
- **When to write them:** When building complex input validators, math/financial calculations, or encoding algorithms.

---

## When Tests Are Required

Contributors are expected to include tests with their pull requests according to the following guidelines:

| Contribution Type | Tests Required? | Expectation |
| :--- | :--- | :--- |
| **New Features** | **Yes (Required)** | Unit tests for new utilities/components/hooks AND integration/E2E tests for new routes/flows. |
| **Bug Fixes** | **Yes (Required)** | Write a regression test that fails before your fix and passes after your fix. |
| **Public API / Schema Changes** | **Yes (Required)** | Integration tests verifying API responses, status codes, payload shapes, and error contracts. |
| **Component Behavior Changes** | **Yes (Required)** | Update or add component unit tests covering new props, state transitions, or interactions. |
| **Regression Fixes** | **Yes (Required)** | Regression unit or integration test ensuring the issue cannot recur silently. |
| **Refactoring** | **Existing tests must pass** | Add new tests if refactoring exposes previously untested execution paths. |
| **Documentation-Only Changes** | **No** | Changes limited to `.md` files, docstrings, or inline comments usually do **not** require tests. |

---

## Coverage Expectations

RemitWise uses **Vitest with the v8 coverage provider** to monitor test coverage over application logic (`lib/**`, `app/**/*.ts(x)`, `components/**/*.tsx`).

### Project Guidelines for Coverage:

- **Maintain or Improve Coverage:** As a contributor, your pull request must maintain or improve the repository's existing code coverage. A PR must not decrease overall or file-level test coverage.
- **Focus on Meaningful Coverage:** Coverage numbers alone are not enough. Focus on testing:
  - Happy path scenarios (expected usage).
  - Edge cases (null/undefined inputs, boundary values, empty arrays).
  - Error branches (validation failures, network timeouts, unauthorized access).
- **No Arbitrary Numbers:** The repository does not enforce an arbitrary hardcoded percentage threshold, but code reviewers and CI will evaluate the coverage diff of your changes. Ensure all lines of code you add or modify are exercised by tests.

Generate coverage locally before submitting your PR:
```bash
npm run test:coverage
```

---

## Where Tests Belong

Follow the repository's established folder structure when placing test files:

```
tests/
├── unit/                 # Isolated unit tests
│   ├── *.test.ts         #   → Vitest specs (TypeScript functions, hooks, state)
│   ├── *.test.cjs        #   → node:test specs (Node-native modules, webhooks, cache)
│   └── validation/       #   → Feature-grouped unit tests
├── property/             # Property-based tests (Vitest + fast-check)
│   └── *.test.ts
├── integration/          # API route & contract integration tests
│   ├── *.test.cjs        #   → node:test integration suites (auth, health)
│   └── api/*.test.ts     #   → Vitest API integration suites
├── session/              # Session handling tests (Vitest)
│   └── *.test.ts
└── e2e/                  # Playwright browser end-to-end specs
    └── *.spec.ts

components/               # UI components
└── **/
    └── *.test.tsx        #   → Vitest component tests (located beside components)
```

### Choosing the Test Location & Runner

1. **Pure TypeScript function / Hook / Store / UI Component:**
   - Location: `tests/unit/<feature>/<name>.test.ts` or `components/<path>/<name>.test.tsx`
   - Runner: **Vitest**
2. **Node-native module (`.cjs`, CommonJS, crypto, middleware):**
   - Location: `tests/unit/<name>.test.cjs`
   - Runner: **node:test** (Must also be added to `test:unit:node` in `package.json`)
3. **API Route or Contract Integration:**
   - Location: `tests/integration/api/<name>.test.ts` (Vitest) or `tests/integration/<name>.test.cjs` (node:test)
4. **End-to-End User Flow:**
   - Location: `tests/e2e/<flow>.spec.ts`
   - Runner: **Playwright**

---

## Running Tests

Use the official project commands defined in `package.json`:

### Essential Commands

```bash
# Run ESLint across the codebase
npm run lint

# Run Next.js build (which includes TypeScript type checking)
npm run build

# Run all unit tests (node:test + Vitest)
npm test
```

### Full Test Suite Commands

```bash
# Run unit tests only
npm run test:unit

# Run property-based tests
npm run test:property

# Run integration tests (requires DATABASE_URL configured)
npm run test:integration

# Run Playwright end-to-end tests (auto-starts dev server)
npm run test:e2e

# Run full Vitest suite with v8 coverage report
npm run test:coverage

# Run Vitest in watch mode (ideal during development)
npm run test:watch

# Launch Vitest graphical UI
npm run test:ui
```

### Running Specific Test Files

To run a single file or target test during development:

```bash
# Run a specific Vitest unit test
npx vitest run tests/unit/validation/savings-goals.test.ts

# Run Vitest tests matching a specific name pattern
npx vitest run -t "rejects zero"

# Run a specific node:test CommonJS file
node --test tests/unit/middleware.test.cjs

# Run a specific Playwright E2E spec
npx playwright test tests/e2e/health.spec.ts

# Run a specific Playwright test line
npx playwright test tests/e2e/send-flow.spec.ts:31
```

---

## Minimum Expectations Before Opening a PR

Before opening or requesting review on a Pull Request, ensure that you have run and verified the following locally:

- [ ] **1. Linting Passes:** `npm run lint` completes with zero errors or warnings.
- [ ] **2. Type Checking Passes:** `npx tsc --noEmit` (or `npm run build`) completes without TypeScript errors.
- [ ] **3. Unit Tests Pass:** `npm test` executes cleanly and all unit tests pass.
- [ ] **4. Integration / E2E Tests Pass:** If your changes touch API routes, database schemas, or user flows, `npm run test:integration` and `npm run test:e2e` pass.
- [ ] **5. New Logic Is Tested:** Tests are included for all newly added functions, hooks, components, routes, or bug fixes.
- [ ] **6. Coverage Is Maintained:** `npm run test:coverage` shows that overall test coverage has been maintained or improved, with no untested new logic.

---

## Related Documentation

For additional details on specific testing subsystems, consult:

- [Frontend Testing Guide](testing.md) — Comprehensive technical reference for test runners and recipes.
- [Integration Testing Guide](TESTING_INTEGRATION.md) — Details on in-process API route testing patterns.
- [Auth Testing Guide](TESTING_AUTH.md) — Patterns for authentication and session testing.
- [Contributing Guidelines](../CONTRIBUTING.md) — Repository setup, branch conventions, and PR workflow.
