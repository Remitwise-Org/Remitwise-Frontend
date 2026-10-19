"use client";

import { Suspense } from "react";
import { useScrollRestoration } from "@/lib/hooks/useScrollRestoration";

function ScrollRestorationInner() {
  useScrollRestoration();
  return null;
}

export default function ScrollRestoration() {
  return (
    <Suspense fallback={null}>
      <ScrollRestorationInner />
    </Suspense>
  );
}
