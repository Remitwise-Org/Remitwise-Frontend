'use client';

import { useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, Clock, X } from 'lucide-react';
import type { SessionPhase } from '@/lib/client/useSessionExpiry';

interface SessionExpiryNotificationProps {
  phase: SessionPhase;
  message: string;
  countdown: number;
  onStaySignedIn: () => void;
  onReconnect: () => void;
  onDismiss: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SessionExpiryNotification({
  phase,
  message,
  countdown,
  onStaySignedIn,
  onReconnect,
  onDismiss,
}: SessionExpiryNotificationProps) {
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const isWarning = phase === 'warning';
  const isExpired = phase === 'expired';
  if (!isWarning && !isExpired) return null;

  useEffect(() => {
    if (phase !== 'none') {
      primaryActionRef.current?.focus();
    }
  }, [phase]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isWarning || isExpired)) {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWarning, isExpired, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="fixed z-[110] top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm animate-slide-in-bottom sm:animate-slide-in-right"
    >
      <div
        className={`rounded-2xl border p-4 shadow-lg backdrop-blur-md ${
          isWarning
            ? 'border-status-warning-border bg-status-warning-soft'
            : 'border-status-error-border bg-status-error-soft'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {isWarning ? (
              <AlertTriangle
                className="h-5 w-5 text-status-warning-fg"
                aria-hidden="true"
              />
            ) : (
              <AlertCircle
                className="h-5 w-5 text-status-error-fg"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold leading-5 ${
                isWarning ? 'text-status-warning-fg' : 'text-status-error-fg'
              }`}
            >
              {isWarning ? 'Session expiring' : 'Session expired'}
            </p>
            <p className="mt-1 text-xs leading-5 text-white/70">{message}</p>

            {isWarning && (
              <div className="mt-3 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-status-warning-fg" aria-hidden="true" />
                <span className="text-xs font-mono font-semibold text-status-warning-fg tabular-nums">
                  {formatCountdown(countdown)}
                </span>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              {isWarning ? (
                <button
                  ref={primaryActionRef}
                  onClick={onStaySignedIn}
                  className="inline-flex items-center justify-center rounded-lg bg-status-warning-fg px-3 py-1.5 text-xs font-semibold text-[#0A0A0A] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-warning-fg focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] touch-target-wide"
                >
                  Stay signed in
                </button>
              ) : (
                <button
                  ref={primaryActionRef}
                  onClick={onReconnect}
                  className="inline-flex items-center justify-center rounded-lg bg-status-error-fg px-3 py-1.5 text-xs font-semibold text-[#0A0A0A] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-error-fg focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] touch-target-wide"
                >
                  Reconnect wallet
                </button>
              )}
            </div>
          </div>

          <button
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="shrink-0 rounded-lg p-1 text-white/40 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-target"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
