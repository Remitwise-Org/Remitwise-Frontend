"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle, ChevronDown } from "lucide-react";
import type { Toast as ToastType } from "@/lib/context/ToastContext";

const VARIANT_STYLES: Record<
  ToastType["variant"],
  { panel: string; icon: string; Icon: React.ElementType }
> = {
  success: {
    panel: "border-status-success-border bg-status-success-soft",
    icon: "text-status-success-fg",
    Icon: CheckCircle2,
  },
  error: {
    panel: "border-status-error-border bg-status-error-soft",
    icon: "text-status-error-fg",
    Icon: AlertCircle,
  },
  warning: {
    panel: "border-status-warning-border bg-status-warning-soft",
    icon: "text-status-warning-fg",
    Icon: AlertTriangle,
  },
  info: {
    panel: "border-status-info-border bg-status-info-soft",
    icon: "text-status-info-fg",
    Icon: Info,
  },
};

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  const { panel, icon, Icon } = VARIANT_STYLES[toast.variant];
  const { duration } = toast;

  const [remaining, setRemaining] = useState(duration ?? 5000);
  const [isPaused, setIsPaused] = useState(false);
  const [isDisclosureOpen, setIsDisclosureOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Determine if diagnostic details are available (only for error variant)
  const hasDiagnostics = 
    toast.variant === "error" && 
    toast.diagnostics && 
    (toast.diagnostics.requestId || toast.diagnostics.errorCode || toast.diagnostics.timestamp);

  useEffect(() => {
    if (duration === 0) return;

    if (isPaused) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, remaining);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      const elapsed = Date.now() - startTimeRef.current;
      setRemaining((prev) => Math.max(0, prev - elapsed));
    };
  }, [isPaused, remaining, duration, toast.id, onDismiss]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);
  const handleFocus = () => setIsPaused(true);
  const handleBlur = () => setIsPaused(false);

  const toggleDisclosure = () => {
    setIsDisclosureOpen(!isDisclosureOpen);
  };

  const handleDisclosureKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleDisclosure();
    }
  };

  return (
    <div
      role="status"
      aria-atomic="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`flex w-full max-w-sm flex-col rounded-2xl border shadow-lg backdrop-blur-md animate-slide-in-bottom sm:animate-slide-in-right ${panel}`}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${icon}`} aria-hidden="true" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-5">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 text-xs leading-5 text-white/60">{toast.description}</p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={`mt-2 text-xs font-semibold underline-offset-2 hover:underline ${icon}`}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-lg p-1 text-white/40 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {hasDiagnostics && (
        <div className="border-t border-white/10">
          <button
            onClick={toggleDisclosure}
            onKeyDown={handleDisclosureKeyDown}
            aria-expanded={isDisclosureOpen}
            aria-controls={`disclosure-content-${toast.id}`}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-white/70 hover:text-white transition focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                isDisclosureOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
            What failed
          </button>

          {isDisclosureOpen && (
            <div
              id={`disclosure-content-${toast.id}`}
              role="region"
              aria-label="Diagnostic details"
              className="border-t border-white/10 bg-white/5 px-4 py-3 space-y-2"
            >
              {toast.diagnostics?.requestId && (
                <div className="text-xs">
                  <dt className="font-medium text-white/70">Request ID:</dt>
                  <dd className="text-white/50 font-mono break-all select-all">
                    {toast.diagnostics.requestId}
                  </dd>
                </div>
              )}

              {toast.diagnostics?.errorCode && (
                <div className="text-xs">
                  <dt className="font-medium text-white/70">Error Code:</dt>
                  <dd className="text-white/50">{toast.diagnostics.errorCode}</dd>
                </div>
              )}

              {toast.description && (
                <div className="text-xs">
                  <dt className="font-medium text-white/70">Error Message:</dt>
                  <dd className="text-white/50 break-words">{toast.description}</dd>
                </div>
              )}

              {toast.diagnostics?.timestamp && (
                <div className="text-xs">
                  <dt className="font-medium text-white/70">Timestamp:</dt>
                  <dd className="text-white/50">{toast.diagnostics.timestamp}</dd>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
