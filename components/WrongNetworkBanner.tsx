"use client";

import { AlertTriangle } from "lucide-react";
import { useWrongNetwork } from "@/lib/hooks/useWrongNetwork";

/**
 * WrongNetworkBanner
 *
 * Renders a full-width warning bar when the connected wallet is on the wrong
 * Stellar network. While visible, all nav actions are blocked via an overlay.
 *
 * Respects `prefers-reduced-motion` through the global CSS rule in globals.css.
 */
export default function WrongNetworkBanner() {
  const { isWrongNetwork, expectedNetwork, activeNetwork } = useWrongNetwork();

  if (!isWrongNetwork) return null;

  const expected = expectedNetwork.charAt(0).toUpperCase() + expectedNetwork.slice(1);
  const active = activeNetwork
    ? activeNetwork.charAt(0).toUpperCase() + activeNetwork.slice(1)
    : "unknown";

  return (
    <>
      {/* Blocking overlay — prevents interaction with the rest of the UI */}
      <div
        className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Banner — sits above the overlay, below the nav (z-[65] > nav z-[60]) */}
      <div
        role="alert"
        aria-live="assertive"
        className="fixed top-20 left-0 right-0 z-[65] flex items-start gap-3 bg-status-warning-bg border-y border-status-warning-border px-4 py-3 sm:items-center"
      >
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-status-warning-fg sm:mt-0"
          aria-hidden="true"
        />

        <div className="flex-1 text-sm text-status-warning-fg">
          <span className="font-semibold">Wrong network detected.</span>{" "}
          Your wallet is connected to{" "}
          <span className="font-mono font-semibold">{active}</span> but this app
          requires{" "}
          <span className="font-mono font-semibold">{expected}</span>.
        </div>

        <div className="hidden shrink-0 text-sm text-status-warning-fg sm:block">
          <span className="font-semibold">How to switch:</span> open your wallet
          extension → Network → select{" "}
          <span className="font-mono font-semibold">{expected}</span>.
        </div>
      </div>

      {/* Mobile-only instructions below the banner line */}
      <div
        className="fixed top-[calc(5rem+3.5rem)] left-0 right-0 z-[65] border-b border-status-warning-border bg-status-warning-bg px-4 pb-3 text-xs text-status-warning-fg sm:hidden"
        aria-hidden="true"
      >
        <span className="font-semibold">How to switch:</span> open your wallet →
        Network → select{" "}
        <span className="font-mono font-semibold">{expected}</span>.
      </div>
    </>
  );
}
