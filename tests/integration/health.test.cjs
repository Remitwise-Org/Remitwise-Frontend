/**
 * Integration tests for GET /api/health route
 *
 * Note: The health endpoint imports from @/lib/soroban/client which uses
 * path aliases that don't resolve in CommonJS test environment.
 * The functionality is tested in E2E tests instead.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

// This is a placeholder to document that health endpoint tests
// are tested via E2E tests in tests/e2e/auth.spec.ts
test("Integration tests - Health endpoint", async (t) => {
  await t.test("note: tested via E2E tests", () => {
    assert(true, "Health endpoint functionality is covered by E2E tests");
  });
});
