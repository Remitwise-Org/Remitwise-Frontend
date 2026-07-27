"use client";

import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Variant constants — single source of truth; reused by tests and stories.
// ---------------------------------------------------------------------------

export const NOTICE_VARIANTS = ["info", "warning", "error", "success"] as const;
export type NoticeVariant = (typeof NOTICE_VARIANTS)[number];

/**
 * Variants that demand immediate screen-reader attention use role="alert"
 * (assertive live region). Informational and success variants use role="status"
 * (polite live region) so they don't interrupt ongoing announcements.
 */
const VARIANT_ROLE: Record<NoticeVariant, "alert" | "status"> = {
  error: "alert",
  warning: "alert",
  info: "status",
  success: "status",
};

/**
 * All styling is driven by design tokens from tailwind.config.js.
 * `panel`  — border + background for the notice card surface (status.*.soft)
 * `icon`   — foreground colour for the icon and title (status.*.fg)
 */
const VARIANT_STYLES: Record<
  NoticeVariant,
  { panel: string; icon: string; Icon: React.ElementType }
> = {
  info: {
    panel: "border-status-info-border bg-status-info-soft",
    icon: "text-status-info-fg",
    Icon: Info,
  },
  warning: {
    panel: "border-status-warning-border bg-status-warning-soft",
    icon: "text-status-warning-fg",
    Icon: AlertTriangle,
  },
  error: {
    panel: "border-status-error-border bg-status-error-soft",
    icon: "text-status-error-fg",
    Icon: AlertCircle,
  },
  success: {
    panel: "border-status-success-border bg-status-success-soft",
    icon: "text-status-success-fg",
    Icon: CheckCircle2,
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NoticeAction {
  /** Visible label for the action button/link. */
  label: string;
  onClick: () => void;
}

export interface NoticeProps {
  /** Visual and semantic variant. Determines colour, icon, and ARIA role. */
  variant: NoticeVariant;
  /**
   * Optional heading rendered in a `<p>` above the body.
   * Keep short — one line maximum.
   */
  title?: string;
  /**
   * Body content. Accepts a string or any React node for rich content
   * (links, code, etc.).
   */
  children: React.ReactNode;
  /**
   * When provided, renders a dismiss (×) button.
   * The caller is responsible for removing the notice from the DOM on dismiss
   * (controlled pattern — same approach as Toast).
   */
  onDismiss?: () => void;
  /**
   * Optional inline action rendered as an underlined button beneath the body.
   * Use for a single contextual CTA (e.g. "Retry", "View details").
   */
  action?: NoticeAction;
  /**
   * Additional Tailwind classes applied to the outermost wrapper element.
   * Use for layout overrides (e.g. margin, width) — avoid re-styling the
   * token-driven surface.
   */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Notice — a reusable inline banner / callout for info, warning, error, and
 * success messages.
 *
 * @example
 * // Basic informational callout
 * <Notice variant="info">Your wallet is in read-only mode.</Notice>
 *
 * @example
 * // Warning with title and dismiss
 * <Notice variant="warning" title="Rates have changed" onDismiss={() => setOpen(false)}>
 *   Exchange rates updated. Your quoted amount may differ.
 * </Notice>
 *
 * @example
 * // Error with action
 * <Notice variant="error" title="Transfer failed" action={{ label: "Retry", onClick: handleRetry }}>
 *   The transfer could not be completed. Please try again.
 * </Notice>
 */
export default function Notice({
  variant,
  title,
  children,
  onDismiss,
  action,
  className = "",
}: NoticeProps) {
  const { panel, icon, Icon } = VARIANT_STYLES[variant];
  const role = VARIANT_ROLE[variant];

  return (
    <div
      role={role}
      aria-atomic="true"
      className={`rounded-2xl border p-4 ${panel} ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        {/* Status icon — decorative, paired with text */}
        <Icon
          className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <p className={`text-sm font-semibold leading-5 ${icon}`}>{title}</p>
          )}
          <div className={`text-sm leading-6 text-white/70 ${title ? "mt-1" : ""}`}>
            {children}
          </div>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={`mt-2 text-xs font-semibold underline-offset-2 hover:underline ${icon} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:rounded`}
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1 text-white/40 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-target"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
