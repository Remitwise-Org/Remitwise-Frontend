/**
 * Example: how to wrap any lazy/dynamic route with ChunkErrorBoundary.
 *
 * In Next.js 14 App Router every page.tsx is already code-split by the
 * framework, so you drop ChunkErrorBoundary into the nearest layout or
 * directly around the page slot.
 *
 * ── app/layout.tsx  (root layout example) ────────────────────────────────
 */

import React, { Suspense } from "react";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";

// A minimal page-level loading skeleton; replace with your real one.
function PageLoadingFallback() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading page…"
      className="flex min-h-[60vh] items-center justify-center"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-primary,#2563eb)] border-t-transparent" />
    </div>
  );
}

/**
 * LazyRouteShell
 *
 * Drop this around any dynamic/lazy segment in your router.
 *
 * @example
 *   // app/(dashboard)/layout.tsx
 *   export default function DashboardLayout({ children }) {
 *     return <LazyRouteShell>{children}</LazyRouteShell>;
 *   }
 */
export function LazyRouteShell({ children }: { children: React.ReactNode }) {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<PageLoadingFallback />}>{children}</Suspense>
    </ChunkErrorBoundary>
  );
}

/**
 * If you need a plain React Router / Vite setup (not Next.js) the pattern is:
 *
 *   const Dashboard = lazy(() => import("./pages/Dashboard"));
 *
 *   <ChunkErrorBoundary>
 *     <Suspense fallback={<PageLoadingFallback />}>
 *       <Dashboard />
 *     </Suspense>
 *   </ChunkErrorBoundary>
 */