"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type ConsentState,
  type ConsentValue,
  getConsentState,
  isGpcEnabled,
  setConsent,
} from "@/lib/consent/consent";
import { useClientTranslator } from "@/lib/i18n/client";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Analytics consent banner.
 *
 * Renders a fixed-position banner at the bottom of the viewport when the
 * user's consent state is `"undecided"` (i.e. EU locale, no cookie, no GPC).
 *
 * When GPC is active the banner is never shown — the signal is honoured
 * silently. When consent has already been recorded via cookie the banner
 * is also hidden.
 *
 * Design:
 * - Uses the repo's Tailwind design tokens (no hard-coded colours)
 * - `slide-in-bottom` entrance animation (already in tailwind.config.js)
 * - Dark-mode aware via the `dark:` variant
 * - Accessible: `role="dialog"`, `aria-label`, focus management
 * - i18n: all strings via `useClientTranslator()`
 */
export default function ConsentBanner() {
  const [state, setState] = useState<ConsentState | null>(null);
  const { t } = useClientTranslator();

  // Resolve consent state on mount (client-only — needs navigator + document)
  useEffect(() => {
    setState(getConsentState());
  }, []);

  const handleAccept = useCallback(() => {
    setConsent("granted");
    setState("granted");
    // Reload so Sentry can initialise with the new consent state
    window.location.reload();
  }, []);

  const handleDecline = useCallback(() => {
    setConsent("denied");
    setState("denied");
  }, []);

  // Don't render during SSR, while loading, or when consent is resolved
  if (state === null || state !== "undecided") return null;

  return (
    <div
      id="consent-banner"
      role="dialog"
      aria-label={t("consent.ariaLabel")}
      className={[
        // Positioning
        "fixed bottom-0 inset-x-0 z-50",
        // Layout
        "flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between",
        // Spacing
        "px-4 py-4 tablet:px-6 tablet:py-3",
        // Visual — glass morphism on dark bg
        "bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md",
        "border-t border-slate-700/50 dark:border-slate-600/30",
        // Shadow
        "shadow-[0_-4px_24px_rgba(0,0,0,0.25)]",
        // Animation (reuse existing design token)
        "animate-slide-in-bottom",
      ].join(" ")}
    >
      {/* Copy */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed text-slate-200 dark:text-slate-300">
          <span className="font-semibold text-white dark:text-slate-100">
            {t("consent.title")}
          </span>{" "}
          {t("consent.body")}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          id="consent-decline-btn"
          type="button"
          onClick={handleDecline}
          className={[
            "px-4 py-2 rounded-lg text-sm font-medium",
            "text-slate-300 dark:text-slate-400",
            "bg-slate-800/60 dark:bg-slate-800/80",
            "hover:bg-slate-700/80 dark:hover:bg-slate-700/60",
            "border border-slate-600/40 dark:border-slate-500/30",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-primary-400",
            "focus-visible:ring-offset-focus focus-visible:ring-offset-slate-900",
          ].join(" ")}
        >
          {t("consent.decline")}
        </button>

        <button
          id="consent-accept-btn"
          type="button"
          onClick={handleAccept}
          className={[
            "px-4 py-2 rounded-lg text-sm font-medium",
            "text-white",
            "bg-primary-600 hover:bg-primary-700",
            "border border-primary-500/30",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-primary-400",
            "focus-visible:ring-offset-focus focus-visible:ring-offset-slate-900",
          ].join(" ")}
        >
          {t("consent.accept")}
        </button>
      </div>
    </div>
  );
}
