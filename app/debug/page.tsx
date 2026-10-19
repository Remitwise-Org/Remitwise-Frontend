"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, notFound } from "next/navigation";
import {
  BUILD_SHA,
  getFeatureFlags,
  getDefaultWalletChain,
  FeatureFlags,
} from "@/lib/config/diagnostics";
import { DEV_MODE_LATEST_REQUEST_ID_KEY } from "@/lib/config/developer";
import { useWrongNetwork } from "@/lib/hooks/useWrongNetwork";
import { Check, Copy, Cpu, Flag, Link2, Hash } from "lucide-react";

function DebugDiagnosticsContent() {
  const searchParams = useSearchParams();
  const debugParam = searchParams.get("debug");

  // Require ?debug=1 to view page
  if (debugParam !== "1") {
    notFound();
  }

  const { activeNetwork } = useWrongNetwork();
  const [lastRequestId, setLastRequestId] = useState<string>("None");
  const [copied, setCopied] = useState(false);
  const [flags, setFlags] = useState<FeatureFlags>(() => getFeatureFlags());

  const currentWalletChain = activeNetwork || getDefaultWalletChain();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedId = sessionStorage.getItem(DEV_MODE_LATEST_REQUEST_ID_KEY);
    if (storedId) {
      setLastRequestId(storedId);
    }

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setLastRequestId(customEvent.detail);
      }
    };

    window.addEventListener("dev-request-id-updated", handleUpdate);
    return () => {
      window.removeEventListener("dev-request-id-updated", handleUpdate);
    };
  }, []);

  const diagnosticsData = {
    buildSha: BUILD_SHA,
    featureFlags: flags,
    walletChain: currentWalletChain,
    lastRequestId: lastRequestId,
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnosticsData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy diagnostics JSON", err);
    }
  };

  return (
    <main
      id="diagnostics-container"
      className="min-h-screen bg-brand-dark p-6 md:p-12 text-white flex flex-col items-center justify-start"
    >
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider">
              <Cpu className="w-4 h-4" />
              <span>System Diagnostics</span>
            </div>
            <h1 className="text-3xl font-bold mt-1 text-white tracking-tight">
              /debug Diagnostics
            </h1>
            <p className="text-sm text-white/60 mt-1">
              Runtime environment, active feature flags, wallet chain, and request tracing.
            </p>
          </div>
          <button
            onClick={copyJson}
            id="diagnostics-copy-json-btn"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors self-start sm:self-auto"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied JSON</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-white/70" />
                <span>Copy Raw JSON</span>
              </>
            )}
          </button>
        </div>

        {/* Diagnostic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Build SHA Card */}
          <div className="bg-bg1 border border-border rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-xs font-mono mb-3">
              <span className="flex items-center gap-1.5 uppercase font-semibold text-white/70">
                <Hash className="w-4 h-4 text-blue-400" />
                Build SHA
              </span>
            </div>
            <div
              id="diagnostics-build-sha"
              className="font-mono text-lg font-bold text-white break-all bg-black/40 p-3 rounded-lg border border-white/5"
            >
              {BUILD_SHA}
            </div>
          </div>

          {/* Wallet Chain Card */}
          <div className="bg-bg1 border border-border rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-xs font-mono mb-3">
              <span className="flex items-center gap-1.5 uppercase font-semibold text-white/70">
                <Link2 className="w-4 h-4 text-purple-400" />
                Current Wallet Chain
              </span>
            </div>
            <div
              id="diagnostics-wallet-chain"
              className="font-mono text-lg font-bold text-emerald-400 capitalize bg-black/40 p-3 rounded-lg border border-white/5"
            >
              {currentWalletChain}
            </div>
          </div>

          {/* Last Request ID Card */}
          <div className="bg-bg1 border border-border rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-xs font-mono mb-3">
              <span className="flex items-center gap-1.5 uppercase font-semibold text-white/70">
                <Cpu className="w-4 h-4 text-amber-400" />
                Last Request-ID
              </span>
            </div>
            <div
              id="diagnostics-last-request-id"
              className="font-mono text-base font-bold text-white break-all bg-black/40 p-3 rounded-lg border border-white/5"
            >
              {lastRequestId}
            </div>
          </div>
        </div>

        {/* Feature Flags Section */}
        <div className="bg-bg1 border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flag className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Feature Flags</h2>
          </div>
          <div
            id="diagnostics-feature-flags"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
          >
            {Object.entries(flags).map(([flagKey, enabled]) => (
              <div
                key={flagKey}
                className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5"
              >
                <span className="font-mono text-xs text-white/80">{flagKey}</span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    enabled
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/5 text-white/40 border border-white/10"
                  }`}
                >
                  {enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function DebugDiagnosticsPage() {
  return (
    <Suspense fallback={null}>
      <DebugDiagnosticsContent />
    </Suspense>
  );
}
