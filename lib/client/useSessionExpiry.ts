'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SessionPhase = 'none' | 'warning' | 'expired';

export interface SessionExpiryState {
  /** Current notification phase. */
  phase: SessionPhase;
  /** User-facing copy for the active notification phase. */
  message: string;
  /** Seconds remaining in the warning phase countdown. */
  countdown: number;
  /** Clears the UI state after dispatching a local `session-refresh` event. */
  staySignedIn: () => void;
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
 * Note that `staySignedIn()` only dispatches `session-refresh`; it does not call
 * `/api/auth/refresh` by itself.
 *
 * @returns The current expiry UI state plus actions for warning dismissal and reconnect.
 */
export function useSessionExpiry(): SessionExpiryState {
  const [phase, setPhase] = useState<SessionPhase>('none');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
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

  const staySignedIn = useCallback(() => {
    window.dispatchEvent(new CustomEvent('session-refresh'));
    reset();
  }, [reset]);

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

  return { phase, message, countdown, staySignedIn, reconnect, clearExpiry: reset };
}
