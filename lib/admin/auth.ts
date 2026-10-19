import * as crypto from "crypto";

/**
 * Interface representing a request with headers.
 * Accepts NextRequest, standard Web Request, or any mock request object.
 */
export interface AdminRequestLike {
  headers: {
    get(name: string): string | null;
  };
}

/**
 * Per-process random key used for constant-time HMAC comparison.
 * Generated once per process to prevent length-oracle timing attacks.
 */
const PROCESS_HMAC_KEY = crypto.randomBytes(32);

let hasLoggedConfigError = false;

function logConfigErrorOnce(): void {
  if (!hasLoggedConfigError) {
    hasLoggedConfigError = true;
    console.error("ADMIN_SECRET is unset or shorter than 32 characters");
  }
}

/**
 * Helper to reset the warning flag for test environments.
 */
export function __resetConfigWarningForTests(): void {
  hasLoggedConfigError = false;
}

/**
 * Reads and parses configured admin secrets from process.env.ADMIN_SECRET.
 * Must be read per call (not cached at module load) to support dynamic configuration and testing.
 * Supports a comma-separated list of secrets for key rotation.
 * All secrets must be at least 32 characters long.
 */
function getConfiguredSecrets(): string[] {
  const proc = (
    globalThis as unknown as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;
  const raw = proc?.env?.ADMIN_SECRET;
  if (!raw || raw.length < 32) {
    logConfigErrorOnce();
    return [];
  }

  const secrets: string[] = raw
    .split(",")
    .map((s: string): string => s.trim())
    .filter((s: string): boolean => s.length >= 32);

  if (secrets.length === 0) {
    logConfigErrorOnce();
    return [];
  }

  return secrets;
}

/**
 * Constant-time comparison using HMAC-SHA256 with a per-process random key.
 * Because HMAC digests are always 32 bytes regardless of input length,
 * timingSafeEqual compares equal-length buffers and will never throw a length mismatch error.
 */
function constantTimeEqual(provided: string, expected: string): boolean {
  const hmacProvided = crypto
    .createHmac("sha256", PROCESS_HMAC_KEY)
    .update(provided)
    .digest();
  const hmacExpected = crypto
    .createHmac("sha256", PROCESS_HMAC_KEY)
    .update(expected)
    .digest();

  return crypto.timingSafeEqual(hmacProvided, hmacExpected);
}

/**
 * Internal helper to find the matching secret if authorized.
 * Only reads from the 'x-admin-key' header.
 * Fails closed if request, headers, or secrets are missing/invalid.
 */
function findMatchingSecret(request: AdminRequestLike): string | null {
  if (!request || !request.headers || typeof request.headers.get !== "function") {
    return null;
  }

  const providedKey = request.headers.get("x-admin-key");
  if (!providedKey) {
    return null;
  }

  const configuredSecrets = getConfiguredSecrets();
  if (configuredSecrets.length === 0) {
    return null;
  }

  let matchedSecret: string | null = null;
  for (const secret of configuredSecrets) {
    if (constantTimeEqual(providedKey, secret)) {
      matchedSecret = secret;
    }
  }

  return matchedSecret;
}

/**
 * Validates whether the incoming request is authorized as admin.
 * Requires credentials exclusively via the 'x-admin-key' header.
 * Cookies and query parameters are ignored.
 */
export function isAdminAuthorized(request: AdminRequestLike): boolean {
  return findMatchingSecret(request) !== null;
}

/**
 * Returns a stable, masked identifier for the authenticated admin key.
 * Formatted as `admin:<hash>` where <hash> is the first 8 hex characters
 * of SHA-256(secret), which is deterministic per secret but never reveals it.
 * Returns 'anonymous' for unauthenticated requests.
 */
export function getAdminIdentity(request: AdminRequestLike): string {
  const matchedSecret = findMatchingSecret(request);
  if (!matchedSecret) {
    return "anonymous";
  }

  const hash = crypto
    .createHash("sha256")
    .update(matchedSecret)
    .digest("hex")
    .slice(0, 8);

  return `admin:${hash}`;
}
