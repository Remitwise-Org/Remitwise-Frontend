/**
 * Frontend session expiry handler
 * Detects session expiry from API responses and manages user flow
 * 
 * @example Usage in API client wrapper
 * ```typescript
 * import { sessionHandler } from '@/lib/client/sessionHandler';
 * 
 * async function apiRequest(url: string, options?: RequestInit) {
 *   const response = await fetch(url, options);
 *   
 *   if (sessionHandler.isSessionExpired(response)) {
 *     sessionHandler.handleSessionExpiry(window.location.pathname);
 *     return null;
 *   }
 *   
 *   return response;
 * }
 * ```
 */

export interface SessionHandler {
  /**
   * Check if response indicates session expiry
   * @param response - The fetch Response object to check
   * @returns true if response is 401 with "Session expired" message
   */
  isSessionExpired(response: Response): Promise<boolean>;
  
  /**
   * Handle session expiry flow
   * Clears local auth state, shows message, and redirects to wallet connection
   * @param intendedPath - Optional path to redirect to after re-authentication
   */
  handleSessionExpiry(intendedPath?: string): void;
  
  /**
   * Dispatch session-expiring warning event
   * Call this when the backend indicates the session is about to expire
   * @param countdown - Seconds remaining before expiry (default 120)
   * @param message - Optional custom message
   */
  dispatchSessionExpiring(countdown?: number, message?: string): void;
  
  /**
   * Attempt to refresh the session
   * @returns true if session was refreshed, false otherwise
   */
  refreshSession(): Promise<boolean>;
  
  /**
   * Clear local authentication state
   * Removes stored wallet address and connection status
   */
  clearAuthState(): void;
}

// Store the active refresh promise to deduplicate concurrent requests
let refreshPromise: Promise<boolean> | null = null;

/**
 * Check if a response indicates session expiry
 * @param response - The fetch Response object to check
 * @returns true if response is 401 with "Session expired" message
 */
async function isSessionExpired(response: Response): Promise<boolean> {
  if (response.status !== 401) {
    return false;
  }
  
  try {
    // Clone the response so the original can still be consumed
    const cloned = response.clone();
    const data = await cloned.json();
    return data.message === 'Session expired';
  } catch {
    // If we can't parse JSON, it's not a session expiry response
    return false;
  }
}

/**
 * Attempt to refresh the current session by calling the refresh endpoint
 * Deduplicates concurrent calls to ensure only one refresh request is made at a time.
 * @returns true if session was refreshed, false otherwise
 */
async function refreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Dispatch session-expiring warning event
 * Call this when the backend indicates the session is about to expire
 * @param countdown - Seconds remaining before expiry (default 120)
 * @param message - Optional custom message
 */
function dispatchSessionExpiring(countdown: number = 120, message?: string): void {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent('session-expiring', {
    detail: {
      message: message || `Your session will expire in ${countdown} seconds. For your security, you'll be signed out automatically.`,
      countdown,
    },
  });
  window.dispatchEvent(event);
}

/**
 * Clear local authentication state
 * Removes stored wallet address and connection status from localStorage
 */
function clearAuthState(): void {
  // Clear any stored authentication data
  if (typeof window !== 'undefined') {
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('auth_state');
  }
}

/**
 * Handle session expiry flow
 * Clears local state, displays message, and redirects to wallet connection
 * @param intendedPath - Optional path to redirect to after re-authentication
 */
function handleSessionExpiry(intendedPath?: string): void {
  if (typeof window === 'undefined') return;
  
  // Clear local authentication state
  clearAuthState();
  
  // Store intended destination for post-auth redirect
  // Preserve the user's intended destination so they can be redirected back after re-authentication
  if (intendedPath && intendedPath !== '/') {
    localStorage.setItem('redirect_after_auth', intendedPath);
  }
  
  // Trigger a custom event that can be listened to by UI components
  // This allows for flexible notification handling (toast, modal, etc.)
  const event = new CustomEvent('session-expired', {
    detail: { message: 'Your session has expired. Please reconnect your wallet.' }
  });
  window.dispatchEvent(event);
  
  // Redirect to wallet connection page (home page)
  // Delay gives the user time to see the expired notification and optionally
  // click "Reconnect wallet" before the auto-redirect fires.
  setTimeout(() => {
    window.location.href = '/';
  }, 15000);
}

/**
 * Session handler instance
 * Use this singleton to handle session expiry across your application
 */
export const sessionHandler: SessionHandler = {
  isSessionExpired,
  refreshSession,
  handleSessionExpiry,
  dispatchSessionExpiring,
  clearAuthState,
};
