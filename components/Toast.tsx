"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Toast as ToastType } from "@/lib/context/ToastContext";
import Notice, { VARIANT_STYLES } from "./Notice";

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  const { icon } = VARIANT_STYLES[toast.variant];
  const { duration } = toast;

  const [remaining, setRemaining] = useState(duration ?? 5000);
  const [isPaused, setIsPaused] = useState(false);
  const [isDisclosureOpen, setIsDisclosureOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);

  // Tracks real unmount (as opposed to this effect's own pause/resume
  // re-runs) so the pause/resume effect below can skip its state update
  // once the toast is actually gone, rather than queuing a setRemaining
  // call against an unmounted component on every dismissal.
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      if (!isMountedRef.current) return;
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

  const isErrorOrWarning = toast.variant === "error" || toast.variant === "warning";

  return (
    <Notice
      variant={toast.variant}
      title={toast.title}
      titleClassName="text-white"
      contentClassName="mt-0.5 text-xs leading-5 text-white/60"
      iconClassName={`mt-0.5 h-4 w-4 shrink-0 ${icon}`}
      role="status"
      aria-live={isErrorOrWarning ? "assertive" : "polite"}
      aria-atomic="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      data-testid={isErrorOrWarning ? "toast-assertive" : "toast-polite"}
      className="pointer-events-auto flex w-full max-w-sm flex-col shadow-lg backdrop-blur-md animate-slide-in-bottom sm:animate-slide-in-right"
      onDismiss={() => onDismiss(toast.id)}
      action={
        toast.action
          ? {
              label: toast.action.label,
              onClick: () => {
                toast.action?.onClick();
                onDismiss(toast.id);
              },
            }
          : undefined
      }
      bottomContent={
        hasDiagnostics && (
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
        )
      }
    >
      {toast.description}
    </Notice>
  );
}
