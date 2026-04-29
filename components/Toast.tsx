"use client";

import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
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

  return (
    <div
      role="status"
      aria-atomic="true"
      className={`flex w-full max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-lg ${panel}`}
    >
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
  );
}
