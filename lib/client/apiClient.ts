/**
 * API client wrapper with session expiry detection, per-request timeouts, and a
 * safe retry layer.
 *
 * This is the **browser** client. It is intentionally separate from the
 * server-side Soroban retry in `lib/soroban/client.ts`; do not stack the two.
 *
 * What it adds on top of `fetch`:
 * - A configurable per-request timeout via `AbortController` (default 10s) for
 *   every method.
 * - Bounded retry with exponential backoff + jitter for **idempotent methods
 *   only** (`GET`/`HEAD`) on network errors, timeouts, `5xx`, and `429`. Writes
 *   (`POST`/`PUT`/`PATCH`/`DELETE`) are never auto-retried, so retries can never
 *   cause a double-submit.
 * - `Retry-After` awareness (e.g. on `429`) so we honor the server's backoff
 *   instead of guessing.
 * - The existing `401 -> refresh -> retry once` session-expiry flow and the
 *   `Response | null` contract, unchanged.
 * - An optional typed `getJson<T>()` helper that parses and validates the body.
 *
 * Aborts are first-class: a caller-supplied `signal` (e.g. from `useFormAction`
 * or a component unmount) cancels immediately and is never retried.
 *
 * @example Basic usage
 * ```typescript
 * import { apiClient } from '@/lib/client/apiClient';
 *
 * const data = await apiClient.get('/api/protected/resource');
 * ```
 *
 * @example Typed read with validation
 * ```typescript
 * const goals = await apiClient.getJson('/api/goals', {
 *   validate: (raw) => GoalsSchema.parse(raw), // any throw-on-invalid validator
 * });
 * ```
 *
 * @example Abort on unmount
 * ```typescript
 * const controller = new AbortController();
 * apiClient.get('/api/insights', { signal: controller.signal });
 * // later: controller.abort();
 * ```
 */

import { sessionHandler } from './sessionHandler';

export interface ApiClientOptions extends RequestInit {
  /** Max retry attempts for idempotent (GET/HEAD) requests. Ignored for writes. Default 3. */
  retries?: number;
  /** Base backoff in ms; doubles each attempt and is jittered. Default 1000. */
  backoff?: number;
  /** Per-request timeout in ms before the request is aborted. `0` disables it. Default 10000. */
  timeout?: number;
  /** Internal flag used to ensure the 401 -> refresh -> retry happens only once. */
  _isRetry?: boolean;
}

export interface GetJsonOptions<T> extends Omit<ApiClientOptions, 'method' | 'body'> {
  /**
   * Optional validator run against the parsed JSON. Return the typed value or
   * throw. Works with any throw-on-invalid validator, e.g. a Zod schema:
   * `validate: (raw) => MySchema.parse(raw)`.
   */
  validate?: (data: unknown) => T;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_BACKOFF = 1000;
const DEFAULT_TIMEOUT = 10_000;

/** Upper bound on how long we will honor a `Retry-After` header. */
const MAX_RETRY_AFTER_MS = 30_000;

/** Methods safe to auto-retry: replaying them cannot change server state. */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD']);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isIdempotent(method?: string): boolean {
  // A missing method means `fetch` defaults to GET, which is idempotent.
  return IDEMPOTENT_METHODS.has((method ?? 'GET').toUpperCase());
}

/**
 * Exponential backoff with "equal jitter": half of the window is fixed and half
 * is random. This bounds the worst case while spreading retries from many
 * clients so they don't reconverge on the server (thundering herd).
 */
function computeBackoff(base: number, attemptIndex: number): number {
  const window = base * 2 ** attemptIndex;
  return window / 2 + Math.random() * (window / 2);
}

/**
 * Parses a `Retry-After` header (delta-seconds or HTTP-date) into milliseconds.
 * Returns `null` when the header is absent or unparseable, so callers fall back
 * to computed backoff. Clamped to {@link MAX_RETRY_AFTER_MS}.
 */
function retryAfterMs(response: Response): number | null {
  const header = response.headers?.get?.('retry-after');
  if (!header) return null;

  const seconds = Number(header);
  let ms: number;
  if (Number.isFinite(seconds)) {
    ms = seconds * 1000;
  } else {
    const at = Date.parse(header);
    if (Number.isNaN(at)) return null;
    ms = at - Date.now();
  }

  if (ms < 0) ms = 0;
  return Math.min(ms, MAX_RETRY_AFTER_MS);
}

/** Normalizes an aborted signal into an `AbortError` for the caller. */
function abortError(signal?: AbortSignal | null): unknown {
  const reason = signal?.reason;
  if (reason) return reason;
  return new DOMException('The operation was aborted.', 'AbortError');
}

/**
 * Combines a caller signal with a per-attempt timeout signal into one signal,
 * and returns a `cleanup` to detach listeners so retries don't leak handlers.
 */
function combineSignals(signals: Array<AbortSignal | null | undefined>): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const attached: Array<{ signal: AbortSignal; handler: () => void }> = [];

  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    const handler = () => controller.abort(signal.reason);
    signal.addEventListener('abort', handler);
    attached.push({ signal, handler });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      for (const { signal, handler } of attached) {
        signal.removeEventListener('abort', handler);
      }
    },
  };
}

/**
 * Performs a single `fetch` with timeout + (for idempotent methods) bounded
 * retry. Caller-initiated aborts short-circuit retries and reject immediately.
 */
async function fetchWithRetry(url: string, options: ApiClientOptions): Promise<Response> {
  const {
    retries = DEFAULT_RETRIES,
    backoff = DEFAULT_BACKOFF,
    timeout = DEFAULT_TIMEOUT,
    signal: callerSignal,
    // Stripped so they never reach `fetch`.
    _isRetry: _ignoredIsRetry,
    ...fetchOptions
  } = options;

  // Writes are never auto-retried, eliminating any double-submit risk.
  const maxRetries = isIdempotent(fetchOptions.method) ? Math.max(0, retries) : 0;

  let attempt = 0;

  for (;;) {
    // Fail fast if the caller already cancelled.
    if (callerSignal?.aborted) {
      throw abortError(callerSignal);
    }

    const timeoutController = new AbortController();
    const timer =
      timeout > 0
        ? setTimeout(
            () =>
              timeoutController.abort(
                new DOMException(`Request to ${url} timed out after ${timeout}ms`, 'TimeoutError')
              ),
            timeout
          )
        : null;

    const { signal, cleanup } = combineSignals([callerSignal, timeoutController.signal]);

    let response: Response | undefined;
    let caught: unknown;
    try {
      response = await fetch(url, { ...fetchOptions, signal });
    } catch (error) {
      caught = error;
    } finally {
      if (timer) clearTimeout(timer);
      cleanup();
    }

    if (caught !== undefined) {
      // A caller abort must surface immediately and never be retried.
      if (callerSignal?.aborted) {
        throw abortError(callerSignal);
      }

      if (attempt < maxRetries) {
        await delay(computeBackoff(backoff, attempt));
        attempt += 1;
        continue;
      }

      // Out of retries: surface a timeout as a clear error, else the original.
      if (timeoutController.signal.aborted) {
        throw timeoutController.signal.reason ?? abortError(timeoutController.signal);
      }
      throw caught;
    }

    const res = response as Response;

    // Retry idempotent requests on transient server states.
    if ((res.status >= 500 || res.status === 429) && attempt < maxRetries) {
      const wait = retryAfterMs(res) ?? computeBackoff(backoff, attempt);
      await delay(wait);
      attempt += 1;
      continue;
    }

    return res;
  }
}

/**
 * Makes a browser-side request to a RemitWise API route with shared timeout,
 * retry, and session handling.
 *
 * Use this instead of raw `fetch` for authenticated client requests so every
 * page gets the same `401 -> refresh -> retry once` behavior.
 *
 * Flow:
 * - Applies a per-request timeout and retries transport failures, timeouts,
 *   `429`, and `5xx` responses with exponential backoff + jitter — but only for
 *   idempotent `GET`/`HEAD` requests.
 * - Detects expired sessions only when the response is a `401` whose JSON body
 *   contains `{ message: 'Session expired' }`.
 * - Attempts `POST /api/auth/refresh` once, then replays the original request once.
 * - Falls back to the terminal session-expiry flow and returns `null` if refresh
 *   cannot recover the request.
 *
 * @param url - API endpoint URL.
 * @param options - Standard `fetch` options plus optional `retries`, `backoff`, and `timeout`.
 * @returns The raw `Response`, or `null` when the session-expiry flow has already been triggered.
 */
async function request(url: string, options?: ApiClientOptions): Promise<Response | null> {
  const response = await fetchWithRetry(url, options || {});

  // Check if session expired
  if (await sessionHandler.isSessionExpired(response)) {
    if (!options?._isRetry) {
      // Attempt to refresh session
      const refreshed = await sessionHandler.refreshSession();
      if (refreshed) {
        // Retry original request once
        return request(url, { ...options, _isRetry: true });
      }
    }

    // If refresh failed or already retried, trigger session expiry flow
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : undefined;
    sessionHandler.handleSessionExpiry(currentPath);
    return null;
  }

  return response;
}

/**
 * Sends a `GET` request through {@link request}.
 *
 * @param url - API endpoint URL.
 * @param options - `fetch` options except `method` and `body`.
 * @returns The raw `Response`, or `null` when the session-expiry flow has already been triggered.
 */
async function get(url: string, options?: Omit<ApiClientOptions, 'method' | 'body'>): Promise<Response | null> {
  return request(url, { ...options, method: 'GET' });
}

/**
 * Sends a `HEAD` request through {@link request}. Like `GET`, it is idempotent
 * and therefore eligible for automatic retries.
 *
 * @param url - API endpoint URL.
 * @param options - `fetch` options except `method` and `body`.
 * @returns The raw `Response`, or `null` when the session-expiry flow has already been triggered.
 */
async function head(url: string, options?: Omit<ApiClientOptions, 'method' | 'body'>): Promise<Response | null> {
  return request(url, { ...options, method: 'HEAD' });
}

/**
 * Sends a `POST` request through {@link request}. Never auto-retried.
 *
 * @param url - API endpoint URL.
 * @param options - `fetch` options except `method`.
 * @returns The raw `Response`, or `null` when the session-expiry flow has already been triggered.
 */
async function post(url: string, options?: Omit<ApiClientOptions, 'method'>): Promise<Response | null> {
  return request(url, { ...options, method: 'POST' });
}

/**
 * Sends a `PUT` request through {@link request}. Never auto-retried.
 *
 * @param url - API endpoint URL.
 * @param options - `fetch` options except `method`.
 * @returns The raw `Response`, or `null` when the session-expiry flow has already been triggered.
 */
async function put(url: string, options?: Omit<ApiClientOptions, 'method'>): Promise<Response | null> {
  return request(url, { ...options, method: 'PUT' });
}

/**
 * Sends a `PATCH` request through {@link request}. Never auto-retried.
 *
 * @param url - API endpoint URL.
 * @param options - `fetch` options except `method`.
 * @returns The raw `Response`, or `null` when the session-expiry flow has already been triggered.
 */
async function patch(url: string, options?: Omit<ApiClientOptions, 'method'>): Promise<Response | null> {
  return request(url, { ...options, method: 'PATCH' });
}

/**
 * Sends a `DELETE` request through {@link request}. Never auto-retried.
 *
 * @param url - API endpoint URL.
 * @param options - `fetch` options except `method` and `body`.
 * @returns The raw `Response`, or `null` when the session-expiry flow has already been triggered.
 */
async function del(url: string, options?: Omit<ApiClientOptions, 'method' | 'body'>): Promise<Response | null> {
  return request(url, { ...options, method: 'DELETE' });
}

/**
 * Typed `GET` + JSON helper. Sends an idempotent `GET` (with the shared timeout
 * and retry behavior), then parses and optionally validates the body.
 *
 * @typeParam T - Expected shape of the parsed body.
 * @param url - API endpoint URL.
 * @param options - `get` options plus an optional `validate` function.
 * @returns The parsed (and validated) body, or `null` when the session-expiry
 *   flow has already been triggered.
 * @throws {ApiClientError} when the response is not OK or the body is not valid JSON.
 * @throws Whatever `validate` throws when validation fails.
 */
async function getJson<T = unknown>(url: string, options?: GetJsonOptions<T>): Promise<T | null> {
  const { validate, ...rest } = options ?? {};

  const response = await get(url, rest);
  // Session-expiry flow already handled by `request`.
  if (response === null) return null;

  if (!response.ok) {
    throw new ApiClientError(
      `Request to ${url} failed with status ${response.status}`,
      response.status,
      response
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    throw new ApiClientError(
      `Failed to parse JSON response from ${url}`,
      response.status,
      response,
      error
    );
  }

  return validate ? validate(data) : (data as T);
}

/**
 * Typed error thrown by {@link getJson} so callers can distinguish a non-OK
 * response or a bad body from a transport/abort failure.
 */
export class ApiClientError extends Error {
  public readonly status?: number;
  public readonly response?: Response;
  public readonly cause?: unknown;

  constructor(message: string, status?: number, response?: Response, cause?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.response = response;
    this.cause = cause;
  }
}

/**
 * Shared browser API client for authenticated requests.
 *
 * Public methods return `Response | null`. `null` means the request ended in the
 * session-expiry flow, so callers should stop work and avoid showing duplicate
 * authentication errors. `getJson` returns the parsed body (or `null`) instead.
 */
export const apiClient = {
  request,
  get,
  head,
  post,
  put,
  patch,
  delete: del,
  getJson,
};
