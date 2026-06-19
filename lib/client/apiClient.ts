/**
 * API client wrapper with session expiry detection and retry mechanism
 * Automatically handles session expiry, redirects users to re-authenticate, and retries failed requests.
 * 
 * @example Basic usage
 * ```typescript
 * import { apiClient } from '@/lib/client/apiClient';
 * 
 * const data = await apiClient.get('/api/protected/resource');
 * ```
 * 
 * @example With request options
 * ```typescript
 * const data = await apiClient.post('/api/protected/action', {
 *   body: JSON.stringify({ key: 'value' }),
 *   headers: { 'Content-Type': 'application/json' },
 *   retries: 2,
 *   backoff: 500
 * });
 * ```
 */

import { sessionHandler } from './sessionHandler';

export interface ApiClientOptions extends RequestInit {
  retries?: number;
  backoff?: number;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_BACKOFF = 1000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: ApiClientOptions): Promise<Response> {
  const { retries = DEFAULT_RETRIES, backoff = DEFAULT_BACKOFF, ...fetchOptions } = options;
  
  try {
    const response = await fetch(url, fetchOptions);

    // Retry on 5xx errors or 429 rate limiting
    if (response.status >= 500 || response.status === 429) {
      if (retries > 0) {
        await delay(backoff);
        return fetchWithRetry(url, { ...options, retries: retries - 1, backoff: backoff * 2 });
      }
    }

    return response;
  } catch (error) {
    // Retry on network errors
    if (retries > 0) {
      await delay(backoff);
      return fetchWithRetry(url, { ...options, retries: retries - 1, backoff: backoff * 2 });
    }
    throw error;
  }
}

/**
 * Makes a browser-side request to a RemitWise API route with shared retry and
 * session handling.
 *
 * Use this instead of raw `fetch` for authenticated client requests so every
 * page gets the same `401 -> refresh -> retry once` behavior.
 *
 * Flow:
 * - Retries transport failures, `429`, and `5xx` responses with exponential backoff.
 * - Detects expired sessions only when the response is a `401` whose JSON body
 *   contains `{ message: 'Session expired' }`.
 * - Attempts `POST /api/auth/refresh` once, then replays the original request once.
 * - Falls back to the terminal session-expiry flow and returns `null` if refresh
 *   cannot recover the request.
 *
 * @param url - API endpoint URL.
 * @param options - Standard `fetch` options plus optional `retries` and `backoff`.
 * @returns The raw `Response`, or `null` when the session-expiry flow has already been triggered.
 */
async function request(url: string, options?: ApiClientOptions): Promise<Response | null> {
  try {
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
  } catch (error) {
    // Network errors should not clear session state
    throw error;
  }
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
 * Sends a `POST` request through {@link request}.
 *
 * @param url - API endpoint URL.
 * @param options - `fetch` options except `method`.
 * @returns The raw `Response`, or `null` when the session-expiry flow has already been triggered.
 */
async function post(url: string, options?: Omit<ApiClientOptions, 'method'>): Promise<Response | null> {
  return request(url, { ...options, method: 'POST' });
}

/**
 * Sends a `PUT` request through {@link request}.
 *
 * @param url - API endpoint URL.
 * @param options - `fetch` options except `method`.
 * @returns The raw `Response`, or `null` when the session-expiry flow has already been triggered.
 */
async function put(url: string, options?: Omit<ApiClientOptions, 'method'>): Promise<Response | null> {
  return request(url, { ...options, method: 'PUT' });
}

/**
 * Sends a `DELETE` request through {@link request}.
 *
 * @param url - API endpoint URL.
 * @param options - `fetch` options except `method` and `body`.
 * @returns The raw `Response`, or `null` when the session-expiry flow has already been triggered.
 */
async function del(url: string, options?: Omit<ApiClientOptions, 'method' | 'body'>): Promise<Response | null> {
  return request(url, { ...options, method: 'DELETE' });
}

/**
 * Shared browser API client for authenticated requests.
 *
 * Public methods return `Response | null`. `null` means the request ended in the
 * session-expiry flow, so callers should stop work and avoid showing duplicate
 * authentication errors.
 */
export const apiClient = {
  request,
  get,
  post,
  put,
  delete: del,
};
