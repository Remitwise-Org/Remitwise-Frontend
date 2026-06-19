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
 * Make an API request with automatic session expiry handling and retries
 * @param url - The API endpoint URL
 * @param options - Fetch options
 * @returns Response object or null if session expired
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
 * Make a GET request
 * @param url - The API endpoint URL
 * @param options - Fetch options
 * @returns Response object or null if session expired
 */
async function get(url: string, options?: Omit<ApiClientOptions, 'method' | 'body'>): Promise<Response | null> {
  return request(url, { ...options, method: 'GET' });
}

/**
 * Make a POST request
 * @param url - The API endpoint URL
 * @param options - Fetch options
 * @returns Response object or null if session expired
 */
async function post(url: string, options?: Omit<ApiClientOptions, 'method'>): Promise<Response | null> {
  return request(url, { ...options, method: 'POST' });
}

/**
 * Make a PUT request
 * @param url - The API endpoint URL
 * @param options - Fetch options
 * @returns Response object or null if session expired
 */
async function put(url: string, options?: Omit<ApiClientOptions, 'method'>): Promise<Response | null> {
  return request(url, { ...options, method: 'PUT' });
}

/**
 * Make a DELETE request
 * @param url - The API endpoint URL
 * @param options - Fetch options
 * @returns Response object or null if session expired
 */
async function del(url: string, options?: Omit<ApiClientOptions, 'method' | 'body'>): Promise<Response | null> {
  return request(url, { ...options, method: 'DELETE' });
}

/**
 * API client with session expiry handling
 * Use this instead of raw fetch for authenticated requests
 */
export const apiClient = {
  request,
  get,
  post,
  put,
  delete: del,
};
