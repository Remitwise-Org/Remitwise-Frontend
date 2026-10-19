'use client';

import { useCallback, useState } from 'react';
import { sessionHandler } from './sessionHandler';
import { safeRedirectPath } from './logout';

const REVOKE_TIMEOUT_MS = 5000;

export interface RevokeCredentialOptions {
  /**
   * Browser location to navigate to after a successful revoke.
   * Defaults to `'/'`.
   */
  redirectTo?: string;
}

export interface UseCredentialRevokeState {
  /** True while a revoke request is in flight. */
  isRevoking: boolean;
  /** Message from the most recently failed revoke attempt, or `null`. */
  error: string | null;
  /**
   * Revokes the current session credential via `POST /api/auth/logout`.
   * Always clears local auth state, regardless of the server response.
   * Resolves `true` on a server-acknowledged revoke, `false` otherwise.
   * On success, navigates the browser to `redirectTo`.
   */
  revoke: (options?: RevokeCredentialOptions) => Promise<boolean>;
}

/**
 * Hook form of the sign-out flow that surfaces `isRevoking`/`error` state to
 * the caller instead of redirecting immediately, so UI that wants to confirm
 * or report failure (e.g. a "revoke this session" action on a security page)
 * has something to render before navigation happens.
 *
 * Shares the same server contract and redirect-sanitization logic as
 * {@link logout} in `./logout`; use that helper instead for a fire-and-forget
 * sign-out button that doesn't need in-place loading/error UI.
 */
export function useCredentialRevoke(): UseCredentialRevokeState {
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revoke = useCallback(async (options: RevokeCredentialOptions = {}): Promise<boolean> => {
    const { redirectTo = '/' } = options;
    const safeTarget = safeRedirectPath(redirectTo);

    setIsRevoking(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REVOKE_TIMEOUT_MS);

    let success = false;
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
        success = true;
      } else {
        setError(`Revoke request failed with status ${response.status}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setError(`Revoke request timed out after ${REVOKE_TIMEOUT_MS}ms`);
      } else {
        setError(err instanceof Error ? err.message : 'Revoke request failed');
      }
    } finally {
      // Always clear local auth state so the client is never stuck "logged in".
      sessionHandler.clearAuthState();
      setIsRevoking(false);
    }

    if (success && typeof window !== 'undefined') {
      window.location.href = safeTarget;
    }

    return success;
  }, []);

  return { isRevoking, error, revoke };
}
