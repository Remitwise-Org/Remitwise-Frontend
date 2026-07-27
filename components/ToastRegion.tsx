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
  const { toasts, history, dismiss } = useToast();

  if (toasts.length === 0 && history.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed z-[100] flex flex-col gap-2 p-4
        bottom-0 left-0 right-0 items-center
        sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto sm:items-end sm:w-auto"
    >
      {toasts.slice(0, 3).map((t) => (
        <Toast key={t.id} toast={t} onDismiss={dismiss} />
      ))}

      {history.length > 0 && (
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-left shadow-lg backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Recent notifications
          </p>
          <ul className="mt-2 space-y-2">
            {history.slice(0, 3).map((item) => (
              <li key={item.id} className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-sm font-medium text-white">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-xs text-white/60">{item.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
