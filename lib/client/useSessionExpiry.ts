'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from './apiClient';
import { sessionHandler } from './sessionHandler';

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

const SESSION_EXPIRY_KEY = 'remitwise_session_expiry';
const WARNING_SECONDS = 60;

function storeSessionExpiry(expiresAt: number) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_EXPIRY_KEY, expiresAt.toString());
  }
}

function getStoredSessionExpiry(): number | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(SESSION_EXPIRY_KEY);
  return stored ? parseInt(stored, 10) : null;
}

function clearStoredSessionExpiry() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  }
}

/**
 * Listens for global session-expiry window events and turns them into local UI state.
 * Also tracks session expiry from stored data and dispatches warnings at T-60s.
 *
 * Phases:
 * - `'warning'`: the app has received a `session-expiring` event or T-60s is reached, and should show a countdown.
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
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    clearCountdown();
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  }, [clearCountdown]);

  const reset = useCallback(() => {
    clearTimers();
    setPhase('none');
    setMessage('');
    setCountdown(0);
  }, [clearTimers]);

  const setSessionExpiry = useCallback((expiresAt: number) => {
    storeSessionExpiry(expiresAt);
    clearTimers();

    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const timeUntilWarning = Math.max(0, timeUntilExpiry - WARNING_SECONDS * 1000);

    if (timeUntilExpiry <= 0) {
      // Session already expired
      sessionHandler.handleSessionExpiry();
      return;
    }

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      sessionHandler.dispatchSessionExpiring(WARNING_SECONDS);
    }, timeUntilWarning);

    // Set expiry timer
    expiryTimerRef.current = setTimeout(() => {
      sessionHandler.handleSessionExpiry();
    }, timeUntilExpiry);
  }, [clearTimers]);

  const staySignedIn = useCallback(async () => {
    if (process.env.NEXT_PUBLIC_SESSION_REFRESH_ENABLED !== 'true') {
      console.warn('Session refresh is disabled.');
      return false;
    }

    setIsRefreshing(true);
    try {
      // Use the server-aware apiClient so 401s are handled consistently.
      const response = await apiClient.post('/api/auth/refresh');
      if (response) {
        const data = await response.json();
        if (data.expiresAt) {
          setSessionExpiry(data.expiresAt);
        }
      }
      // Dispatch success to clear UI warnings (handled by the listener below).
      window.dispatchEvent(new CustomEvent('session-refresh'));
      return true;
    } catch (error) {
      console.error('Session refresh failed', error);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [setSessionExpiry]);

  const reconnect = useCallback(() => {
    window.location.href = '/';
  }, []);

  // Initial load: check stored expiry and fetch current session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await apiClient.get('/api/auth/me');
        if (response) {
          const data = await response.json();
          if (data.expiresAt) {
            setSessionExpiry(data.expiresAt);
          }
        }
      } catch (error) {
        console.error('Failed to fetch session', error);
      }
    };

    const storedExpiry = getStoredSessionExpiry();
    if (storedExpiry) {
      setSessionExpiry(storedExpiry);
    }

    fetchSession();
  }, [setSessionExpiry]);

  useEffect(() => {
    const handleExpiring = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      clearCountdown();
      setPhase('warning');
      setMessage(detail.message || 'Your session is about to expire. For your security, you will be signed out automatically.');
      const initialCountdown = detail.countdown ?? WARNING_SECONDS;
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
      clearTimers();
      clearStoredSessionExpiry();
      const detail = (event as CustomEvent).detail || {};
      setPhase('expired');
      setMessage(detail.message || 'Your session has expired. Please reconnect your wallet to continue.');
      setCountdown(0);
    };

    const handleRefresh = () => {
      reset();
    };

    // Listen for login events to store new session expiry
    const handleLogin = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.expiresAt) {
        setSessionExpiry(detail.expiresAt);
      }
    };

    window.addEventListener('session-expiring', handleExpiring);
    window.addEventListener('session-expired', handleExpired);
    window.addEventListener('session-refresh', handleRefresh);
    window.addEventListener('session-login', handleLogin);

    return () => {
      window.removeEventListener('session-expiring', handleExpiring);
      window.removeEventListener('session-expired', handleExpired);
      window.removeEventListener('session-refresh', handleRefresh);
      window.removeEventListener('session-login', handleLogin);
      clearTimers();
    };
  }, [clearCountdown, clearTimers, reset, setSessionExpiry]);

  return { phase, message, countdown, isRefreshing, staySignedIn, reconnect, clearExpiry: reset };
}
