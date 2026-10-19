"use client";

import React, { Suspense, ReactNode } from "react";
import { ChunkErrorBoundary } from "./ChunkErrorBoundary";

interface Props {
  children: ReactNode;
  /** Rendered when a non-chunk error is caught */
  errorFallback?: ReactNode;
  /** Rendered while loading */
  loadingFallback: ReactNode;
}

/**
 * FeatureBoundary
 *
 * Wraps a feature area with both a Suspense boundary and a ChunkErrorBoundary
 * for consistent loading and error handling.
 *
 * Use this when you have a dynamic or lazy-loaded feature that needs
 * both a loading skeleton and explicit error/retry handling.
 *
 * @example
 *   <FeatureBoundary
 *     loadingFallback={<Spinner />}
 *     errorFallback={<ErrorDisplay />}
 *   >
 *     <LazyComponent />
 *   </FeatureBoundary>
 */
export function FeatureBoundary({
  children,
  errorFallback,
  loadingFallback,
}: Props) {
  return (
    <ChunkErrorBoundary fallback={errorFallback}>
      <Suspense fallback={loadingFallback}>{children}</Suspense>
    </ChunkErrorBoundary>
  );
}
