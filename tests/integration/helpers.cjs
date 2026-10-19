/**
 * Integration test helper utilities.
 *
 * Provides simple, focused helpers for:
 * - Calling route handlers directly
 * - Asserting response status codes
 * - Parsing and validating JSON responses
 */

const assert = require("node:assert/strict");

/**
 * Call a route handler directly and return the response.
 *
 * @param handler - Route handler function (e.g., GET or POST from route file)
 * @param request - Request object to pass to handler
 * @returns Promise<Response>
 */
async function callHandler(handler, request) {
  return handler(request);
}

/**
 * Assert that a response has the expected status code.
 *
 * @param response - Response object from handler
 * @param expectedStatus - Expected HTTP status code
 */
function expectStatus(response, expectedStatus) {
  assert.equal(
    response.status,
    expectedStatus,
    `Expected status ${expectedStatus}, got ${response.status}`,
  );
}

/**
 * Parse response body as JSON and return it.
 *
 * @param response - Response object from handler
 * @returns Promise<unknown> - Parsed JSON
 */
async function expectJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${text}. Error: ${error}`);
  }
}

/**
 * Assert that a response has expected status AND can be parsed as JSON.
 *
 * @param response - Response object from handler
 * @param expectedStatus - Expected HTTP status code
 * @returns Promise<unknown> - Parsed JSON if assertion passes
 */
async function expectStatusJson(response, expectedStatus) {
  expectStatus(response, expectedStatus);
  return expectJson(response);
}

/**
 * Assert that an object has a property with expected value.
 *
 * @param obj - Object to check
 * @param key - Property name
 * @param expectedValue - Expected value (optional; just checks key exists if not provided)
 */
function expectProperty(obj, key, expectedValue) {
  assert(
    typeof obj === "object" && obj !== null,
    `Expected object, got ${typeof obj}`,
  );

  const object = obj;
  assert(key in object, `Expected property "${key}" to exist`);

  if (expectedValue !== undefined) {
    assert.equal(
      object[key],
      expectedValue,
      `Expected ${key}="${expectedValue}", got "${object[key]}"`,
    );
  }
}

/**
 * Assert that response is 401 Unauthorized with an error message.
 *
 * @param response - Response object from handler
 */
async function expectUnauthorized(response) {
  expectStatus(response, 401);
  const body = await expectJson(response);
  assert(
    body.error || body.message,
    "Expected error or message in 401 response body",
  );
}

/**
 * Assert that response is 400 Bad Request with an error message.
 *
 * @param response - Response object from handler
 */
async function expectBadRequest(response) {
  expectStatus(response, 400);
  const body = await expectJson(response);
  assert(
    body.error || body.message,
    "Expected error or message in 400 response body",
  );
}

module.exports = {
  callHandler,
  expectStatus,
  expectJson,
  expectStatusJson,
  expectProperty,
  expectUnauthorized,
  expectBadRequest,
};
