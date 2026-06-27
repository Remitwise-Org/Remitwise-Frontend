"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

// Detects errors thrown when a dynamic import chunk fails to load
// (network blip, CDN cache miss after a deploy, etc.)
function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk [\d]+ failed/i.test(error.message) ||
    /Failed to fetch dynamically imported module/i.test(error.message) ||
    /Importing a module script failed/i.test(error.message)
  );
}

interface Props {
  children: ReactNode;
  /** Rendered when a non-chunk error is caught – defaults to null (re-throws). */
  fallback?: ReactNode;
}

interface State {
  hasChunkError: boolean;
  hasOtherError: boolean;
  error: Error | null;
}

/**
 * ChunkErrorBoundary
 *
 * Wraps lazy-loaded routes so that chunk-load failures (network blips,
 * stale CDN after a deploy) show a user-facing "Retry" screen instead of
 * a blank white page.
 *
 * Usage:
 *   <ChunkErrorBoundary>
 *     <Suspense fallback={<Spinner />}>
 *       <LazyRoute />
 *     </Suspense>
 *   </ChunkErrorBoundary>
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasChunkError: false, hasOtherError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    if (isChunkLoadError(error)) {
      return { hasChunkError: true, hasOtherError: false, error };
    }
    return { hasChunkError: false, hasOtherError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to any error-reporting service (e.g. Sentry) when wired up
    if (process.env.NODE_ENV !== "test") {
      console.error("[ChunkErrorBoundary]", error, info.componentStack);
    }
  }

  handleRetry = () => {
    // Force a full-page reload so the browser fetches fresh chunk hashes
    window.location.reload();
  };

  render() {
    const { hasChunkError, hasOtherError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasChunkError) {
      return (
        <div
          role="alert"
          className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center"
          data-testid="chunk-error-ui"
        >
          {/* Icon */}
          <div className="rounded-full bg-[color:var(--color-warning-subtle,#fef3c7)] p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-[color:var(--color-warning,#d97706)]"
              aria-hidden="true"
            >
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-[color:var(--color-text-primary,#111827)]">
              Failed to load page
            </h2>
            <p className="max-w-sm text-sm text-[color:var(--color-text-secondary,#6b7280)]">
              A resource couldn&apos;t be downloaded — this usually happens
              after an update or a slow connection. Try reloading the page.
            </p>
          </div>

          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-lg bg-[color:var(--color-primary,#2563eb)] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary,#2563eb)]"
          >
            Reload page
          </button>
        </div>
      );
    }

    if (hasOtherError) {
      // If a custom fallback is provided, render it; otherwise re-throw by
      // rendering a minimal error message (avoids swallowing unrelated errors).
      if (fallback !== undefined) return <>{fallback}</>;

      return (
        <div
          role="alert"
          className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center"
          data-testid="generic-error-ui"
        >
          <h2 className="text-xl font-semibold text-[color:var(--color-text-primary,#111827)]">
            Something went wrong
          </h2>
          {process.env.NODE_ENV === "development" && error && (
            <pre className="max-w-lg overflow-auto rounded bg-gray-100 p-4 text-left text-xs text-red-600">
              {error.message}
            </pre>
          )}
        </div>
      );
    }

    return <>{children}</>;
  }
}

export default ChunkErrorBoundary;