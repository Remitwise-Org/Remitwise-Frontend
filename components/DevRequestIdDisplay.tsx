"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Check, Terminal } from "lucide-react";
import {
  DEV_MODE_QUERY_PARAM,
  DEV_MODE_ENABLED_VALUE,
  DEV_MODE_STORAGE_KEY,
  DEV_MODE_LATEST_REQUEST_ID_KEY,
} from "@/lib/config/developer";

function DevRequestIdInner() {
  const [isDevMode, setIsDevMode] = useState(false);
  const [latestRequestId, setLatestRequestId] = useState<string>("None");
  const [copied, setCopied] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check query params
    const queryVal = searchParams.get(DEV_MODE_QUERY_PARAM);
    let enabled = false;

    if (queryVal !== null) {
      enabled = queryVal === DEV_MODE_ENABLED_VALUE;
      sessionStorage.setItem(DEV_MODE_STORAGE_KEY, enabled ? "true" : "false");
    } else {
      const stored = sessionStorage.getItem(DEV_MODE_STORAGE_KEY);
      enabled = stored === "true";
    }

    setIsDevMode(enabled);

    if (enabled) {
      const storedId = sessionStorage.getItem(DEV_MODE_LATEST_REQUEST_ID_KEY);
      if (storedId) {
        setLatestRequestId(storedId);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isDevMode || typeof window === "undefined") return;

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const newId = customEvent.detail;
      setLatestRequestId(newId);
      sessionStorage.setItem(DEV_MODE_LATEST_REQUEST_ID_KEY, newId);
    };

    window.addEventListener("dev-request-id-updated", handleUpdate);
    return () => {
      window.removeEventListener("dev-request-id-updated", handleUpdate);
    };
  }, [isDevMode]);

  const copyToClipboard = async () => {
    if (latestRequestId === "None") return;
    try {
      await navigator.clipboard.writeText(latestRequestId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  if (!isDevMode) return null;

  return (
    <div
      id="dev-request-id-container"
      className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-brand-dark/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 md:bottom-8 md:left-8"
    >
      <div className="flex items-center gap-2">
        <div className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          <Terminal className="h-3 w-3" />
          Developer Mode
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
          Latest Request ID
        </span>
        <div className="mt-1 flex items-center gap-3">
          <span
            id="dev-request-id-value"
            className="font-mono text-sm font-medium text-white tracking-tight"
          >
            {latestRequestId}
          </span>
          {latestRequestId !== "None" && (
            <button
              onClick={copyToClipboard}
              aria-label="Copy request ID"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DevRequestIdDisplay() {
  return (
    <Suspense fallback={null}>
      <DevRequestIdInner />
    </Suspense>
  );
}
