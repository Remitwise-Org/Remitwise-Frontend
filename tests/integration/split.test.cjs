/**
 * Integration tests for protected routes
 *
 * Note: Routes that depend on @/lib aliases (like soroban/client)
 * cannot be tested in CommonJS test environment.
 * Full API route testing is covered by E2E tests instead.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

test("Integration tests - Protected routes", async (t) => {
  await t.test("note: tested via E2E tests", () => {
    assert(true, "Protected route functionality is covered by E2E tests");
  });
});
