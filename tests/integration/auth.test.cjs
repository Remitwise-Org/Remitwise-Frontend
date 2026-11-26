/**
 * Integration tests for POST /api/auth/* routes
 *
 * Note: The nonce and login endpoints now use lib/auth/nonces.ts (Prisma-backed).
 * Full auth flow tests live in tests/e2e/auth.spec.ts (Playwright).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { setTestEnv } = require("./setup.cjs");

// Set up test environment before running tests
setTestEnv();

test("Integration tests - Auth routes", async (t) => {
  await t.test("note: auth flow is covered by E2E tests", () => {
    assert(true, "Auth flow is exercised via Playwright");
  });
});
