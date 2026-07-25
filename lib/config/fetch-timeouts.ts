/**
 * Per-endpoint fetch timeout policy.
 *
 * Every entry declares the maximum number of milliseconds the caller will wait
 * before the request is aborted. Route patterns are matched with
 * {@link getTimeoutForUrl} using a prefix/contains check, falling back to
 * {@link DEFAULT_FETCH_TIMEOUT_MS} when no rule matches.
 *
 * ## Conventions
 * - Keep all values in this file. Do **not** hard-code timeouts inline at call
 *   sites — reference these constants so they remain auditable and consistent.
 * - Use snake_case for the constant name and mirror the route path as closely as
 *   possible so the mapping is obvious at a glance.
 * - When a rule covers a whole namespace (e.g. `/api/anchor`) all routes under
 *   that namespace inherit the same limit unless overridden with a more specific
 *   key.
 *
 * See {@link getTimeoutForUrl} for the matching algorithm.
 */

// ── Base default ─────────────────────────────────────────────────────────────

/**
 * Fallback timeout applied to any URL that has no specific policy entry.
 * Matches the `apiClient` default of 10 s.
 */
export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

// ── Anchor platform routes ────────────────────────────────────────────────────

/**
 * Exchange-rate lookups are read-only and served from a CDN cache, so a tight
 * deadline is appropriate.
 */
export const ANCHOR_RATES_TIMEOUT_MS = 5_000;

/**
 * Interactive deposit/withdraw flows hit the anchor's backend and may need to
 * provision a session. Allow a bit more room than a cached read.
 */
export const ANCHOR_DEPOSIT_TIMEOUT_MS = 15_000;

/** Same reasoning as {@link ANCHOR_DEPOSIT_TIMEOUT_MS}. */
export const ANCHOR_WITHDRAW_TIMEOUT_MS = 15_000;

/**
 * Generic anchor timeout used for any anchor route that does not have a more
 * specific entry.
 */
export const ANCHOR_DEFAULT_TIMEOUT_MS = 5_000;

// ── Auth routes ───────────────────────────────────────────────────────────────

/** Nonce generation is lightweight; fail fast. */
export const AUTH_NONCE_TIMEOUT_MS = 5_000;

/** Signature verification involves a crypto operation server-side. */
export const AUTH_LOGIN_TIMEOUT_MS = 8_000;

/** Token refresh should be fast to avoid blocking subsequent requests. */
export const AUTH_REFRESH_TIMEOUT_MS = 5_000;

// ── Contract/RPC routes ───────────────────────────────────────────────────────

/**
 * Contract reads go through the Soroban RPC node and may take longer under
 * network congestion.
 */
export const CONTRACT_READ_TIMEOUT_MS = 12_000;

/**
 * Sending a transaction involves signing and network propagation, so allow a
 * generous window.
 */
export const SEND_TIMEOUT_MS = 20_000;

// ── Health / telemetry ────────────────────────────────────────────────────────

/** Health checks must be fast; they are used by uptime monitors. */
export const HEALTH_TIMEOUT_MS = 3_000;

/** Metrics collection is best-effort; do not block on it. */
export const METRICS_TIMEOUT_MS = 3_000;

// ── Policy map ────────────────────────────────────────────────────────────────

/**
 * A map from URL fragment (prefix or substring) to timeout in milliseconds.
 *
 * The map is evaluated in declaration order by {@link getTimeoutForUrl}; the
 * first matching key wins. More-specific patterns should therefore appear before
 * more-general ones.
 */
export const ENDPOINT_TIMEOUTS: ReadonlyArray<readonly [string, number]> = [
  // Auth
  ['/api/auth/nonce', AUTH_NONCE_TIMEOUT_MS],
  ['/api/auth/login', AUTH_LOGIN_TIMEOUT_MS],
  ['/api/auth/refresh', AUTH_REFRESH_TIMEOUT_MS],

  // Anchor — specific routes first, generic last
  ['/api/anchor/deposit', ANCHOR_DEPOSIT_TIMEOUT_MS],
  ['/api/anchor/withdraw', ANCHOR_WITHDRAW_TIMEOUT_MS],
  ['/api/anchor/rates', ANCHOR_RATES_TIMEOUT_MS],
  ['/api/anchor', ANCHOR_DEFAULT_TIMEOUT_MS],

  // Send / remittance
  ['/api/send', SEND_TIMEOUT_MS],

  // Health + metrics
  ['/api/health', HEALTH_TIMEOUT_MS],
  ['/api/metrics', METRICS_TIMEOUT_MS],

  // Contract interactions
  ['/api/contracts', CONTRACT_READ_TIMEOUT_MS],
  ['/api/goals', CONTRACT_READ_TIMEOUT_MS],
  ['/api/bills', CONTRACT_READ_TIMEOUT_MS],
  ['/api/insurance', CONTRACT_READ_TIMEOUT_MS],
  ['/api/split', CONTRACT_READ_TIMEOUT_MS],
  ['/api/family', CONTRACT_READ_TIMEOUT_MS],
] as const;

// ── Lookup helper ─────────────────────────────────────────────────────────────

/**
 * Returns the configured timeout in milliseconds for the given URL.
 *
 * Matching algorithm:
 * 1. Iterate {@link ENDPOINT_TIMEOUTS} in declaration order.
 * 2. Return the timeout for the first entry whose key appears anywhere in
 *    `url` (i.e. `url.includes(key)`).
 * 3. Fall back to {@link DEFAULT_FETCH_TIMEOUT_MS} when nothing matches.
 *
 * @param url - The full URL (or path) of the request.
 * @returns Timeout in milliseconds.
 *
 * @example
 * ```ts
 * getTimeoutForUrl('/api/anchor/rates');  // → 5_000
 * getTimeoutForUrl('/api/anchor/deposit'); // → 15_000
 * getTimeoutForUrl('/api/unknown');        // → 10_000 (default)
 * ```
 */
export function getTimeoutForUrl(url: string): number {
  for (const [pattern, timeout] of ENDPOINT_TIMEOUTS) {
    if (url.includes(pattern)) {
      return timeout;
    }
  }
  return DEFAULT_FETCH_TIMEOUT_MS;
}
