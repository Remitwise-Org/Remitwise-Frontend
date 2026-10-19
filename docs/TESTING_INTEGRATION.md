# Integration Tests Guide

This guide explains how to run and write integration tests for API routes.

## Overview

Integration tests for API routes are located in `tests/integration/`. They use Node.js's built-in `test` module to directly call route handlers with mock requests, asserting on status codes and response shapes.

### Why Direct Handler Calls?

Instead of spinning up a full Next.js server, we import route handlers directly and call them as functions. This approach:

- ✅ **Fast**: No server startup overhead
- ✅ **Deterministic**: No flaky timing issues
- ✅ **Easy to Debug**: Direct function calls are easier to trace
- ✅ **Isolated**: Tests don't interfere with each other

## Running Tests

### Run All Tests (Unit + Integration)

```bash
npm test
```

### Run Only Integration Tests

```bash
npm run test:integration
```

### Run Integration Tests in Watch Mode

```bash
npm run test:integration:watch
```

### Run a Specific Test File

```bash
node --import tsx/esm --test tests/integration/health.test.cjs
```

## Test Structure

Each test file follows this pattern:

```typescript
import test from "node:test";
import { setTestEnv, createMockRequest } from "./setup.js";
import { callHandler, expectStatus } from "./helpers.js";
import { GET } from "@/app/api/your/route/route.js";

// Set up environment
setTestEnv();

test("GET /api/your/route", async (t) => {
  await t.test("should return 200 with expected response", async () => {
    const request = createMockRequest("GET", "/api/your/route");
    const response = await callHandler(GET, request);

    expectStatus(response, 200);
    // Add more assertions...
  });
});
```

## Available Test Utilities

### From `tests/integration/setup.ts`

#### `setTestEnv()`

Configures test environment (in-memory DB, session password, etc.). Call once per test file.

```typescript
setTestEnv();
```

#### `createMockRequest(method, path, options?)`

Create a mock Request object for testing.

```typescript
// Simple GET request
const request = createMockRequest("GET", "/api/health");

// POST with body
const request = createMockRequest("POST", "/api/auth/login", {
  body: { address: "GTEST123", signature: "sig" },
});

// With headers
const request = createMockRequest("GET", "/api/split", {
  headers: { "X-Custom-Header": "value" },
});

// With cookies
const request = createMockRequest("GET", "/api/split", {
  cookies: { session_id: "abc123" },
});
```

#### `createMockSession(address)`

Create an encrypted session cookie for authenticated requests.

```typescript
const session = await createMockSession(
  "GBNRAKMZMK7VYN7YSMV2AVVQUHCZQPBJ6IYHGFAUWXRPQVGGFCZPCLVP",
);
```

#### `createAuthenticatedRequest(method, path, address, options?)`

Create a request with a valid session cookie automatically.

```typescript
const request = await createAuthenticatedRequest(
  "GET",
  "/api/split",
  "GBNRAKMZMK7VYN7YSMV2AVVQUHCZQPBJ6IYHGFAUWXRPQVGGFCZPCLVP",
);
```

### From `tests/integration/helpers.ts`

#### `callHandler(handler, request)`

Call a route handler with a request object.

```typescript
import { GET } from "@/app/api/health/route.js";

const response = await callHandler(GET, request);
```

#### `expectStatus(response, expectedStatus)`

Assert response status code.

```typescript
expectStatus(response, 200);
expectStatus(response, 401);
```

#### `expectJson(response)`

Parse and return response JSON. Throws if not valid JSON.

```typescript
const body = await expectJson(response);
console.log(body);
```

#### `expectStatusJson(response, expectedStatus)`

Assert status AND parse JSON in one call.

```typescript
const body = await expectStatusJson(response, 200);
```

#### `expectUnauthorized(response)`

Assert 401 response with error message.

```typescript
await expectUnauthorized(response);
```

#### `expectBadRequest(response)`

Assert 400 response with error message.

```typescript
await expectBadRequest(response);
```

#### `expectProperty(obj, key, expectedValue?)`

Assert object has a property (optionally with a specific value).

```typescript
expectProperty(body, "status", "ok");
expectProperty(body, "nonce"); // Just checks it exists
```

## Writing New Tests

### 1. Create a Test File

Create `tests/integration/your-route.test.ts`:

```typescript
import test from "node:test";
import {
  setTestEnv,
  createMockRequest,
  createAuthenticatedRequest,
} from "./setup.js";
import { callHandler, expectStatus, expectStatusJson } from "./helpers.js";
import { GET, POST } from "@/app/api/your/route/route.js";

setTestEnv();

test("GET /api/your/route", async (t) => {
  await t.test("should return 200 when valid", async () => {
    const request = createMockRequest("GET", "/api/your/route");
    const response = await callHandler(GET, request);
    expectStatus(response, 200);
  });

  await t.test("should return 401 when unauthenticated", async () => {
    const request = createMockRequest("GET", "/api/your/route");
    const response = await callHandler(GET, request);
    expectStatus(response, 401);
  });

  await t.test("should return 200 when authenticated", async () => {
    const address = "GBNRAKMZMK7VYN7YSMV2AVVQUHCZQPBJ6IYHGFAUWXRPQVGGFCZPCLVP";
    const request = await createAuthenticatedRequest(
      "GET",
      "/api/your/route",
      address,
    );
    const response = await callHandler(GET, request);
    const body = await expectStatusJson(response, 200);

    // Validate response shape
    if (typeof body !== "object" || body === null) {
      throw new Error("Expected object response");
    }
  });
});
```

### 2. Test Both Success and Failure Cases

Each route should test:

- ✅ Happy path (valid inputs, expected response)
- ✅ Auth required (401 if no session)
- ✅ Invalid inputs (400 for bad request)
- ✅ Response shape (expected fields present)

### 3. Use Assertions from Helpers

Prefer the helper assertions over raw `assert`:

```typescript
// ✅ Good
expectStatus(response, 200);
const body = await expectJson(response);
expectProperty(body, "status", "ok");

// ❌ Avoid
assert.equal(response.status, 200);
const body = JSON.parse(await response.text());
```

## Environment Variables

Test environment is automatically set by `setTestEnv()`:

| Variable           | Value           | Purpose                           |
| ------------------ | --------------- | --------------------------------- |
| `DATABASE_URL`     | `file::memory:` | In-memory SQLite (fast, isolated) |
| `SESSION_PASSWORD` | 32-char string  | Required for `iron-session`       |
| `STELLAR_NETWORK`  | `testnet`       | Stellar network selection         |
| `TEST_MODE`        | `true`          | Optional flag for test detection  |

No additional setup needed.

## Common Patterns

### Testing a Protected Route

```typescript
await t.test("should return 401 without auth", async () => {
  const request = createMockRequest("GET", "/api/protected");
  const response = await callHandler(GET, request);
  expectStatus(response, 401);
});

await t.test("should return 200 with auth", async () => {
  const address = "GBNRAKMZMK7VYN7YSMV2AVVQUHCZQPBJ6IYHGFAUWXRPQVGGFCZPCLVP";
  const request = await createAuthenticatedRequest(
    "GET",
    "/api/protected",
    address,
  );
  const response = await callHandler(GET, request);
  const body = await expectStatusJson(response, 200);
});
```

### Testing POST with Body

```typescript
await t.test("should reject invalid input", async () => {
  const request = createMockRequest("POST", "/api/some/route", {
    body: { invalid: "data" },
  });
  const response = await callHandler(POST, request);
  await expectBadRequest(response);
});

await t.test("should accept valid input", async () => {
  const request = createMockRequest("POST", "/api/some/route", {
    body: { required: "value", count: 5 },
  });
  const response = await callHandler(POST, request);
  const body = await expectStatusJson(response, 200);
});
```

### Testing Response Shape

```typescript
await t.test("should have expected fields", async () => {
  const request = createMockRequest("GET", "/api/data");
  const response = await callHandler(GET, request);
  const body = await expectStatusJson(response, 200);

  // Check structure
  expectProperty(body, "id");
  expectProperty(body, "name");
  expectProperty(body, "createdAt");
});
```

## Debugging Tests

### Run with Verbose Output

```bash
node --test --verbose tests/integration/health.test.ts
```

### Run Single Test

Wrap other tests with `.test.skip`:

```typescript
test("should not run", { skip: true }, async () => {});
test("should run", async () => {});
```

### Log in Tests

```typescript
import { setTestEnv, createMockRequest } from "./setup.js";

setTestEnv();

const request = createMockRequest("GET", "/api/test");
console.log("Request:", request);
const response = await callHandler(GET, request);
console.log("Response status:", response.status);
```

### Check Test Coverage

The current test suite covers:

- ✅ Health check (no auth required)
- ✅ Auth routes (nonce, login, logout)
- ✅ Protected routes (401 without session, 200 with session)
- ✅ Validation errors (400, 401 responses)
- ✅ Response shapes (expected fields)

## CI/CD Integration

Tests run in GitHub Actions with:

```yaml
- name: Run Integration Tests
  run: npm run test:integration
```

Required environment variables in CI:

- `DATABASE_URL` - Auto-set to `:memory:` by tests
- `SESSION_PASSWORD` - Auto-set by tests
- No external dependencies needed
- Tests are fast (<10 seconds) and deterministic

## Troubleshooting

### Tests Not Found

Make sure test files are in `tests/integration/` and end with `.test.ts`:

```
tests/integration/your-route.test.ts ✅
tests/integration/your-route.ts ❌
tests/your-route.test.ts ❌
```

### Import Errors

Use explicit `.js` extensions in imports (even for `.ts` files):

```typescript
import { setTestEnv } from "./setup.js"; // ✅
import { setTestEnv } from "./setup"; // ❌
```

### Database Connection Errors

The in-memory database is isolated per test file. Each run gets a fresh DB.
No persistent database needed.

### Session Validation Errors

Make sure `SESSION_PASSWORD` is at least 32 characters:

```typescript
// In setup.ts - already correct
process.env.SESSION_PASSWORD = "test-session-password-min-32-chars!!!!";
```

## Next Steps

To add more tests:

1. Create `tests/integration/new-route.test.ts`
2. Import route handler(s)
3. Call `setTestEnv()` at module level
4. Write test cases using helpers
5. Run `npm run test:integration`

Example routes to test next:

- `GET /api/bills`
- `POST /api/goals`
- `GET /api/insurance`
- `POST /api/send`
