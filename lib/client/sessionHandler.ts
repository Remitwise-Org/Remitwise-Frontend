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

/**
 * Path to the sign-in page. Requests that fail with a session-expired 401 will
 * redirect here with the current route passed as a `?next=` query parameter.
 */
export const SIGN_IN_PATH = '/' as const;

/**
 * Builds the sign-in URL preserving the current route so the user can be
 * redirected back after re-authentication.
 *
 * @param intendedPath - The page the user was on when the session expired.
 * @returns A sign-in URL with `?next=` set, or just the sign-in path when
 *          `intendedPath` is absent or unsafe.
 */
export function getSignInUrl(intendedPath?: string): string {
  if (!intendedPath || intendedPath === '/') return SIGN_IN_PATH;
  const encoded = encodeURIComponent(intendedPath);
  return `${SIGN_IN_PATH}?next=${encoded}`;
}

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
   * preserving the current route in `?next=` for post-auth redirect.
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
 * Known auth-related localStorage keys that must be cleared on logout
 * or session expiry.
 *
 * Declared as a const array so it serves as a single source of truth for
 * both the clear function and tests.
 */
export const AUTH_STORAGE_KEYS = [
  'wallet_address',
  'wallet_connected',
  'auth_state',
  'remitwise_session_expiry',
  'redirect_after_auth',
] as const;

/**
 * Prefix pattern for form-state entries in localStorage.
 * Any key starting with this prefix is treated as user-entered form data
 * that must be wiped on logout to prevent accidental exposure of sensitive
 * or stale information after a session change.
 */
export const FORM_STATE_PREFIX = 'remitwise_form_' as const;

/**
 * Additional sessionStorage keys that may hold form draft data.
 * These are cleared alongside localStorage entries.
 */
export const SESSION_STORAGE_FORM_KEYS = ['form_draft', 'transfer_draft', 'bill_draft'] as const;

/**
 * Wipe all client-side state from both localStorage and sessionStorage.
 *
 * This is a defensive sweep:
 * 1. Removes every known auth key (wallet address, session data, redirect).
 * 2. Removes every localStorage key starting with `FORM_STATE_PREFIX` — this
 *    catches dynamically-named form draft keys added by any component.
 * 3. Removes known sessionStorage draft keys.
 *
 * The sweep is best-effort — if `localStorage` or `sessionStorage` throws
 * (e.g. private browsing on some older browsers) the error is swallowed.
 */
export function wipeClientState(): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Clear known auth keys
    for (const key of AUTH_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }

    // 2. Clear any key with the form-state prefix (catches dynamic keys)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(FORM_STATE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }

    // 3. Clear sessionStorage draft keys
    for (const key of SESSION_STORAGE_FORM_KEYS) {
      sessionStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable — swallow
  }
}

/**
 * Clear local authentication state
 * Removes stored wallet address, connection status, and any form state
 * from localStorage and sessionStorage.
 */
function clearAuthState(): void {
  wipeClientState();
}

/**
 * Handle session expiry flow
 * Clears local state, displays message, and redirects to wallet connection
 * preserving the current route in the `?next=` query parameter.
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
  
  // Redirect to wallet connection page (home page) with the current route
  // preserved in the `?next=` parameter so the user is sent back after
  // re-authentication.
  const target = getSignInUrl(intendedPath);
  setTimeout(() => {
    window.location.href = target;
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
