/**
 * Regression tests for issue #1127 – "Add tests for the Boundary component
 * fallback rendering"
 *
 * LazyRouteShell composes Suspense (loading fallback) and ChunkErrorBoundary
 * (error fallback) into a single wrapper. These tests lock in that both
 * states render a fallback and never leak the wrapped children while doing so.
 */

import React, { lazy } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { LazyRouteShell } from "./LazyRouteShell";

function suppressReactErrorLogs() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("LazyRouteShell - loading state", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the loading fallback while the lazy import is pending", async () => {
    let resolveImport!: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveImport = resolve;
    });

    const PendingLazy = lazy(() =>
      pending.then(() => ({
        default: () => <div data-testid="loaded-content">Loaded</div>,
      }))
    );

    render(
      <LazyRouteShell>
        <PendingLazy />
      </LazyRouteShell>
    );

    expect(screen.getByLabelText("Loading page…")).toBeInTheDocument();
    expect(screen.queryByTestId("loaded-content")).not.toBeInTheDocument();

    resolveImport();
    await waitFor(() => screen.getByTestId("loaded-content"));
  });
});

describe("LazyRouteShell - error state", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the chunk-error fallback when the lazy import fails", async () => {
    suppressReactErrorLogs();

    const chunkError = Object.assign(new Error("Loading chunk 3 failed."), {
      name: "ChunkLoadError",
    });
    const FailingLazy = lazy(() => Promise.reject(chunkError));

    render(
      <LazyRouteShell>
        <FailingLazy />
      </LazyRouteShell>
    );

    expect(screen.getByLabelText("Loading page…")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId("chunk-error-ui")).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /reload page/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading page…")).not.toBeInTheDocument();
  });
});

describe("LazyRouteShell - happy path", () => {
  it("renders children once the lazy import resolves, with no fallback left behind", async () => {
    const OkLazy = lazy(() =>
      Promise.resolve({
        default: () => <div data-testid="loaded-content">Loaded</div>,
      })
    );

    render(
      <LazyRouteShell>
        <OkLazy />
      </LazyRouteShell>
    );

    await waitFor(() => screen.getByTestId("loaded-content"));
    expect(screen.queryByLabelText("Loading page…")).not.toBeInTheDocument();
    expect(screen.queryByTestId("chunk-error-ui")).not.toBeInTheDocument();
  });
});
