"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/config/features";

function FeatureFlagIndicatorInner() {
  const pathname = usePathname();

  if (process.env.NODE_ENV !== "development") return null;

  const activeFlags = FEATURE_FLAGS.filter((flag) => {
    if (!isFeatureEnabled(flag)) return false;
    return flag.routes.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    );
  });

  if (activeFlags.length === 0) return null;

  return (
    <div
      id="feature-flag-indicator"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-1.5"
    >
      {activeFlags.map((flag) => (
        <div
          key={flag.key}
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-400 backdrop-blur-sm"
        >
          ⚑ {flag.label}
        </div>
      ))}
    </div>
  );
}

export default function FeatureFlagIndicator() {
  return (
    <Suspense fallback={null}>
      <FeatureFlagIndicatorInner />
    </Suspense>
  );
}