"use client";

import { useToast } from "@/lib/context/ToastContext";
import Toast from "./Toast";

/**
 * Renders the global toast stack.
 * Place once inside ToastProvider — already wired in app/layout.tsx.
 *
 * Placement: fixed, top-right on desktop; bottom-center on mobile.
 * aria-live="assertive" for error toasts is handled per-item via role="status"
 * (which maps to aria-live="polite"). For errors that need immediate interruption,
 * callers should use duration=0 and the user dismisses manually.
 */
export default function ToastRegion() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed z-[100] flex flex-col gap-2 p-4
        bottom-0 left-0 right-0 items-center
        sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto sm:items-end sm:w-auto"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
