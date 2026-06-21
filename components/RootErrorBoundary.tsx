"use client";

import * as Sentry from "@sentry/nextjs";
import React from "react";
import RootErrorFallback from "@/components/RootErrorFallback";

interface RootErrorBoundaryProps {
  children: React.ReactNode;
}

interface RootErrorBoundaryState {
  error: Error | null;
  resetKey: number;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Top-level client error boundary for the app shell.
 *
 * It captures render-time failures that happen outside dashboard widgets,
 * reports them to Sentry, and uses a key-based reset so retrying remounts the
 * entire protected subtree instead of only clearing boundary state.
 */
export default class RootErrorBoundary extends React.Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: unknown): Partial<RootErrorBoundaryState> {
    return { error: toError(error) };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    try {
      Sentry.captureException(error, {
        tags: { boundary: "root" },
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    } catch (captureError) {
      console.error("Failed to capture root render error with Sentry:", captureError);
    }

    console.error("Root render error:", error);
  }

  reset = (): void => {
    this.setState(({ resetKey }) => ({
      error: null,
      resetKey: resetKey + 1,
    }));
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return <RootErrorFallback onReset={this.reset} />;
    }

    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}
