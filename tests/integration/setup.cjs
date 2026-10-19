/**
 * Integration test setup utilities.
 *
 * Provides lightweight helpers for:
 * - Setting up test environment variables
 * - Creating mock NextRequest objects
 * - Creating authenticated session cookies
 */

const { sealData } = require("iron-session");

/**
 * Configure test environment variables before tests run.
 * Call this in your test file's before hook.
 */
function setTestEnv() {
  // In-memory SQLite database for fast, isolated tests
  process.env.DATABASE_URL = "file::memory:";

  // Session password (min 32 chars for iron-session)
  process.env.SESSION_PASSWORD = "test-session-password-min-32-chars!!!";

  // Stellar network
  process.env.STELLAR_NETWORK = "testnet";

  // Flag to skip certain initializations
  process.env.TEST_MODE = "true";
}

/**
 * Create a mock NextRequest for testing route handlers.
 *
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - API route path (e.g., '/api/health')
 * @param options - Optional body, headers, cookies
 * @returns Request instance
 */
function createMockRequest(method, path, options = {}) {
  const url = `http://localhost:3000${path}`;
  const headers = new Headers(options.headers || {});

  // Set Content-Type if body is present
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  // Add cookies to Cookie header
  if (options.cookies) {
    const cookieString = Object.entries(options.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
    headers.set("Cookie", cookieString);
  }

  const init = {
    method,
    headers,
    ...(options.body && { body: JSON.stringify(options.body) }),
  };

  return new Request(url, init);
}

/**
 * Create an encrypted session cookie for authenticated requests.
 *
 * @param address - Stellar public key address
 * @returns Promise<string> - Encrypted session cookie value
 */
async function createMockSession(address) {
  const password = process.env.SESSION_PASSWORD;
  if (!password) {
    throw new Error("SESSION_PASSWORD not set");
  }

  const sessionData = {
    address,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const sealed = await sealData(sessionData, {
    password,
    ttl: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  return sealed;
}

/**
 * Create a mock authenticated request with session cookie.
 *
 * @param method - HTTP method
 * @param path - API route path
 * @param address - Stellar public key for session
 * @param options - Additional options (body, headers)
 * @returns Promise<Request>
 */
async function createAuthenticatedRequest(method, path, address, options = {}) {
  const session = await createMockSession(address);

  return createMockRequest(method, path, {
    ...options,
    cookies: {
      remitwise_session: session,
    },
  });
}

module.exports = {
  setTestEnv,
  createMockRequest,
  createMockSession,
  createAuthenticatedRequest,
};
