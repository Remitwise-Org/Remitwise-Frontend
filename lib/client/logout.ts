/**
 * Logout helper for frontend
 * Handles logout API call, state clearing, and redirect
 *
 * @example Usage in a component
 * ```typescript
 * import { logout } from '@/lib/client/logout';
 *
 * function LogoutButton() {
 *   const handleLogout = async () => {
 *     await logout();
 *   };
 *
 *   return <button onClick={handleLogout}>Logout</button>;
 * }
 * ```
 */

import { sessionHandler } from './sessionHandler';

export interface LogoutOptions {
  /**
   * Browser location to navigate to after the logout attempt completes.
   * Defaults to `'/'`.
   */
  redirectTo?: string;
}

const LOGOUT_TIMEOUT_MS = 5000;

/**
 * Validates that a redirect target is a safe, same-origin relative path.
 * Rejects absolute URLs (https://evil.com) and protocol-relative (//evil.com).
 * Falls back to '/' for null, undefined, or any invalid input.
 */
export function safeRedirectPath(path: string | null | undefined): string {
  if (!path || typeof path !== 'string') return '/';
  // Must start with '/' but not '//' (protocol-relative)
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  // Catch any URL-encoded or embedded absolute URLs
  if (path.includes('://')) return '/';
  return path;
}

/**
 * Performs an explicit sign-out from the browser.
 *
 * Behavior:
 * - Sends `POST /api/auth/logout`.
 * - Clears local auth state even if the request fails.
 * - Always redirects the browser in `finally`.
 *
 * This is the helper to use for sign-out buttons and menus. It is separate from
 * the automatic session-expiry flow used by {@link apiClient}.
 *
 * @param options - Optional redirect target after logout.
 * @returns A promise that settles after the logout attempt and redirect assignment.
 */
export async function logout(options: LogoutOptions = {}): Promise<void> {
  const { redirectTo = '/' } = options;
  const safeTarget = safeRedirectPath(redirectTo);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOGOUT_TIMEOUT_MS);

  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.info('Logout successful:', data.message);
    } else {
      console.warn('Logout API returned non-OK status:', response.status);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Logout request timed out after ${LOGOUT_TIMEOUT_MS}ms`);
    } else {
      console.error('Logout error:', error);
    }
  } finally {
    // Always clear local auth state so the client is never stuck "logged in"
    sessionHandler.clearAuthState();

    if (typeof window !== 'undefined') {
      window.location.href = safeTarget;
    }
  }
}

/**
 * Reads and clears the path captured by the session-expiry flow.
 *
 * Call this after a successful wallet reconnect or login to restore the user's
 * last protected route.
 *
 * @returns The stored redirect path, or `null` when none is present.
 */
export function getPostAuthRedirect(): string | null {
  if (typeof window === 'undefined') return null;

  const redirectPath = localStorage.getItem('redirect_after_auth');
  if (redirectPath) {
    localStorage.removeItem('redirect_after_auth');
    return safeRedirectPath(redirectPath);
  }

  return null;
}
