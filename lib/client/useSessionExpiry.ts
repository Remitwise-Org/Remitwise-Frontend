'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from './apiClient';

export type SessionPhase = 'none' | 'warning' | 'expired';

export interface SessionExpiryState {
  /** Current notification phase. */
  phase: SessionPhase;
  /** User-facing copy for the active notification phase. */
  message: string;
  /** Seconds remaining in the warning phase countdown. */
  countdown: number;
  /** True while a server-side session refresh is in flight. */
  isRefreshing: boolean;
  /**
   * Attempts to refresh the server session via `/api/auth/refresh`.
   * On success, dispatches a local `session-refresh` event (which clears the
   * notification state) and resolves `true`; resolves `false` otherwise.
   */
  staySignedIn: () => Promise<boolean>;
  /** Redirects the browser to the reconnect entry point (`/`). */
  reconnect: () => void;
  /** Resets all local expiry UI state without redirecting. */
  clearExpiry: () => void;
}

/**
 * Listens for global session-expiry window events and turns them into local UI state.
 *
 * Phases:
 * - `'warning'`: the app has received a `session-expiring` event and should show a countdown.
 * - `'expired'`: the app has received `session-expired`, or the warning countdown reached zero.
 *
 * Event contract:
 * - `session-expiring` sets the warning message and countdown.
 * - `session-expired` switches immediately to the expired state.
 * - `session-refresh` clears the local notification state.
 *
 * `staySignedIn()` calls the server-aware {@link apiClient} to refresh the session
 * (gated by `NEXT_PUBLIC_SESSION_REFRESH_ENABLED`) and, on success, dispatches
 * `session-refresh` to clear the warning.
 *
 * @returns The current expiry UI state plus actions for warning dismissal and reconnect.
 */
export function useSessionExpiry(): SessionExpiryState {
  const [phase, setPhase] = useState<SessionPhase>('none');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearCountdown();
    setPhase('none');
    setMessage('');
    setCountdown(0);
  }, [clearCountdown]);

  const staySignedIn = useCallback(async () => {
    if (process.env.NEXT_PUBLIC_SESSION_REFRESH_ENABLED !== 'true') {
      console.warn('Session refresh is disabled.');
      return false;
    }

    setIsRefreshing(true);
    try {
      // Use the server-aware apiClient so 401s are handled consistently.
      await apiClient.post('/api/auth/refresh');
      // Dispatch success to clear UI warnings (handled by the listener below).
      window.dispatchEvent(new CustomEvent('session-refresh'));
      return true;
    } catch (error) {
      console.error('Session refresh failed', error);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const reconnect = useCallback(() => {
    window.location.href = '/';
  }, []);

  useEffect(() => {
    const handleExpiring = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      clearCountdown();
      setPhase('warning');
      setMessage(detail.message || 'Your session is about to expire. For your security, you will be signed out automatically.');
      const initialCountdown = detail.countdown ?? 120;
      setCountdown(initialCountdown);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearCountdown();
            setPhase('expired');
            setMessage('Your session has expired. Please reconnect your wallet to continue.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleExpired = (event: Event) => {
      clearCountdown();
      const detail = (event as CustomEvent).detail || {};
      setPhase('expired');
      setMessage(detail.message || 'Your session has expired. Please reconnect your wallet to continue.');
      setCountdown(0);
    };

    const handleRefresh = () => {
      reset();
    };

    window.addEventListener('session-expiring', handleExpiring);
    window.addEventListener('session-expired', handleExpired);
    window.addEventListener('session-refresh', handleRefresh);

    return () => {
      window.removeEventListener('session-expiring', handleExpiring);
      window.removeEventListener('session-expired', handleExpired);
      window.removeEventListener('session-refresh', handleRefresh);
      clearCountdown();
    };
  }, [clearCountdown, reset]);

  return { phase, message, countdown, isRefreshing, staySignedIn, reconnect, clearExpiry: reset };
}
