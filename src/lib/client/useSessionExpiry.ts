'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SessionPhase = 'none' | 'warning' | 'expired';

export interface SessionExpiryState {
  phase: SessionPhase;
  message: string;
  countdown: number;
  staySignedIn: () => void;
  reconnect: () => void;
  clearExpiry: () => void;
}

/**
 * Hook to listen for session expiry events
 * Supports two phases:
 * - 'warning': session about to expire, shows countdown
 * - 'expired': session has expired, shows reconnect action
 *
 * Usage:
 * const { phase, message, countdown, staySignedIn, reconnect, clearExpiry } = useSessionExpiry();
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
