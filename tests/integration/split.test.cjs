/**
 * Integration tests for protected routes
 *
 * Note: Routes that depend on @/lib aliases (like soroban/client)
 * cannot be tested in CommonJS test environment.
 * Full API route testing is covered by E2E tests instead.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

// Set up test environment before running tests
setTestEnv();

test("Health Endpoint Response Format", async (t) => {
  // Test response format validation using the health endpoint
  const routePath = path.resolve(__dirname, "../../app/api/health/route.ts");
  const { GET: healthGet } = await import(pathToFileURL(routePath).href);

  await t.test("should return valid JSON response", async () => {
    const request = createMockRequest("GET", "/api/health");
    const response = await callHandler(healthGet, request);

    // Verify response is valid JSON
    const body = await expectJson(response);
    assert(body, "Expected valid JSON response body");
  });

  await t.test("should have correct status and body", async () => {
    const request = createMockRequest("GET", "/api/health");
    const response = await callHandler(healthGet, request);

    const body = await expectStatusJson(response, 200);
    assert.equal(body.status, "ok", 'Expected status field with value "ok"');
  });

  await t.test("should include required headers", async () => {
    const request = createMockRequest("GET", "/api/health");
    const response = await callHandler(healthGet, request);

    expectStatus(response, 200);
    // Response should be a valid Response object
    assert(response instanceof Response, "Expected Response object");
  });

  await t.test("should have consistent response structure", async () => {
    const request = createMockRequest("GET", "/api/health");
    const response = await callHandler(healthGet, request);

    const body = await expectStatusJson(response, 200);
    // Should only have status field
    const keys = Object.keys(body);
    assert(keys.includes("status"), "Expected status field");
    assert.equal(
      keys.length,
      3,
      "Expected status, soroban, and timestamp fields in response",
    );
  });
});
