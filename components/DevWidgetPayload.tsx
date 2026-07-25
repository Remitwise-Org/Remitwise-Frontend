"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Terminal } from "lucide-react";
import {
  DEV_MODE_QUERY_PARAM,
  DEV_MODE_ENABLED_VALUE,
  DEV_MODE_STORAGE_KEY,
  DEV_MODE_WIDGET_PAYLOAD_KEY,
  DEV_WIDGET_PAYLOAD_EVENT,
} from "@/lib/config/developer";
import type { DashboardResponse } from "@/lib/types/dashboard";

// ─── Section accordion ────────────────────────────────────────────────────────

interface SectionProps {
  label: string;
  data: unknown;
}

function Section({ label, data }: SectionProps) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  return (
    <div className="border-t border-white/[0.06] pt-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left text-[10px] font-semibold uppercase tracking-wider text-white/50 hover:text-white/80 transition-colors"
      >
        <span>{label}</span>
        {open ? (
          <ChevronUp className="h-3 w-3 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />
        )}
      </button>
      {open && (
        <pre
          className="mt-2 max-h-48 overflow-auto rounded-lg bg-white/[0.04] p-2 font-mono text-[10px] leading-relaxed text-white/80 scrollbar-thin"
          aria-label={`${label} payload`}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Inner panel (needs useSearchParams — wrapped in Suspense below) ──────────

function DevWidgetPayloadInner() {
  const [isDevMode, setIsDevMode] = useState(false);
  const [payload, setPayload] = useState<DashboardResponse | null>(null);
  const searchParams = useSearchParams();

  // Determine dev-mode state (same logic as DevRequestIdDisplay)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const queryVal = searchParams.get(DEV_MODE_QUERY_PARAM);
    let enabled = false;

    if (queryVal !== null) {
      enabled = queryVal === DEV_MODE_ENABLED_VALUE;
      sessionStorage.setItem(DEV_MODE_STORAGE_KEY, enabled ? "true" : "false");
    } else {
      enabled = sessionStorage.getItem(DEV_MODE_STORAGE_KEY) === "true";
    }

    setIsDevMode(enabled);

    // Restore persisted payload so the panel is useful after client-side nav
    if (enabled) {
      const stored = sessionStorage.getItem(DEV_MODE_WIDGET_PAYLOAD_KEY);
      if (stored) {
        try {
          setPayload(JSON.parse(stored) as DashboardResponse);
        } catch {
          // Corrupt storage — ignore; the next fetch will repopulate it.
        }
      }
    }
  }, [searchParams]);

  // Listen for the custom event dispatched by the dashboard page on each fetch
  useEffect(() => {
    if (!isDevMode || typeof window === "undefined") return;

    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent<DashboardResponse>).detail;
      setPayload(detail);
      try {
        sessionStorage.setItem(
          DEV_MODE_WIDGET_PAYLOAD_KEY,
          JSON.stringify(detail)
        );
      } catch {
        // sessionStorage quota exceeded — non-fatal.
      }
    };

    window.addEventListener(DEV_WIDGET_PAYLOAD_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(DEV_WIDGET_PAYLOAD_EVENT, handleUpdate);
    };
  }, [isDevMode]);

  if (!isDevMode) return null;

  return (
    <div
      id="dev-widget-payload-container"
      className="fixed bottom-6 right-6 z-50 flex w-80 flex-col gap-3 rounded-xl border border-white/[0.08] bg-brand-dark/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 md:bottom-8 md:right-8"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          <Terminal className="h-3 w-3" aria-hidden="true" />
          Widget Payloads
        </span>
      </div>

      {payload === null ? (
        <p className="text-[10px] text-white/40">
          Waiting for dashboard fetch…
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <Section label="remittance" data={payload.remittance} />
          <Section label="savings" data={payload.savings} />
          <Section label="bills" data={payload.bills} />
          <Section label="insurance" data={payload.insurance} />
          <Section label="meta" data={payload.meta} />
        </div>
      )}
    </div>
  );
}

// ─── Public export (Suspense boundary required by useSearchParams) ────────────

/**
 * Floating developer panel that appears only when `?dev=1` is present.
 *
 * Displays the last-fetched raw `DashboardResponse` payload broken down by
 * widget section (remittance, savings, bills, insurance, meta). Each section
 * is collapsible to keep the panel compact.
 *
 * The panel position (`bottom-right`) is intentionally distinct from
 * `DevRequestIdDisplay` (`bottom-left`) so both can be visible simultaneously.
 *
 * Lifecycle:
 * - `app/dashboard/page.tsx` dispatches a `dev-widget-payload-updated`
 *   `CustomEvent` on `window` after every successful `/api/dashboard` fetch.
 * - This component listens for that event and stores the payload in
 *   `sessionStorage` (key: `dev-widget-payload`) so it survives client-side
 *   navigation.
 *
 * @see lib/config/developer.ts — constant definitions
 * @see DEV_WIDGET_PAYLOAD_EVENT
 */
export default function DevWidgetPayload() {
  return (
    <Suspense fallback={null}>
      <DevWidgetPayloadInner />
    </Suspense>
  );
}
