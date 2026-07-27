"use client";

import { useEffect, useRef } from "react";
import { useNetworkStatus } from "@/lib/context/NetworkStatusContext";
import { useToast } from "@/lib/context/ToastContext";

export default function NetworkStatusIndicator() {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const prevRef = useRef(isOnline);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === isOnline) return;
    prevRef.current = isOnline;

    if (isOnline) {
      toast({ variant: "success", title: "Back online" });
    } else {
      toast({
        variant: "error",
        title: "You are offline",
        description: "Some features may be unavailable until your connection is restored.",
      });
    }
  }, [isOnline, toast]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isOnline ? "Online" : "Offline"}
      className={`hidden 450:inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-medium leading-none whitespace-nowrap ${
        isOnline
          ? "text-status-success-fg bg-status-success-bg border-status-success-border"
          : "text-status-error-fg bg-status-error-bg border-status-error-border"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isOnline ? "bg-status-success-fg" : "bg-status-error-fg"
        }`}
      />
      {isOnline ? "Online" : "Offline"}
    </div>
  );
}
