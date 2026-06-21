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
   * Redirect path after logout
   * Defaults to '/' (home page)
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
 * Perform logout
 * Awaits server confirmation before clearing local auth state and redirecting.
 * On timeout or network failure, still clears local state so the client is
 * never stuck "logged in".
 * @param options - Logout options including redirect path
 * @returns Promise that resolves when logout is complete
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
 * Check if user should be redirected after authentication
 * Returns the stored redirect path if available, validated to be a safe
 * same-origin relative path.
 * @returns Redirect path or null
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
