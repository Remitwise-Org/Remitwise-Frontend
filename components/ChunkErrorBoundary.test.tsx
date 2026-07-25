/**
 * @vitest-environment jsdom
 *
 * Regression tests for issue #723 – "Add error boundary around lazy-loaded routes"
 *
 * These tests FAIL before ChunkErrorBoundary exists and PASS after it is wired up.
 */

import React, { Suspense, lazy } from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChunkErrorBoundary } from "./ChunkErrorBoundary";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Silences React's noisy console.error during intentional error boundary tests */
function suppressReactErrorLogs() {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  return () => spy.mockRestore();
}

/** A component that always throws the supplied error */
function PanickingChild({ error }: { error: Error }) {
  throw error;
}

// ---------------------------------------------------------------------------
// isChunkLoadError detection – we test three real-world error shapes
// ---------------------------------------------------------------------------

describe("ChunkErrorBoundary – chunk load failures", () => {
  let restore: () => void;

  beforeEach(() => {
    restore = suppressReactErrorLogs();
  });

  afterEach(() => {
    restore();
    vi.restoreAllMocks();
  });

  const chunkErrors = [
    {
      label: "Webpack ChunkLoadError name",
      error: Object.assign(new Error("Loading chunk 42 failed."), {
        name: "ChunkLoadError",
      }),
    },
    {
      label: "Webpack message pattern",
      error: new Error("Loading chunk 7 failed. (missing: /static/js/7.abc.js)"),
    },
    {
      label: "Vite / native ESM dynamic import failure",
      error: new Error(
        "Failed to fetch dynamically imported module: https://app.example.com/assets/Dashboard.abc123.js"
      ),
    },
    {
      label: "Safari native ESM pattern",
      error: new Error("Importing a module script failed."),
    },
  ];

  for (const { label, error } of chunkErrors) {
    it(`shows retry UI for: ${label}`, () => {
      render(
        <ChunkErrorBoundary>
          <PanickingChild error={error} />
        </ChunkErrorBoundary>
      );

      expect(
        screen.getByTestId("chunk-error-ui"),
        `Expected chunk-error-ui to be in the document for "${label}"`
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /reload page/i })
      ).toBeInTheDocument();
    });
  }

  it("does NOT show chunk-error-ui for a plain runtime error", () => {
    const runtimeError = new Error("Cannot read properties of undefined");

    render(
      <ChunkErrorBoundary fallback={<div data-testid="generic-fallback" />}>
        <PanickingChild error={runtimeError} />
      </ChunkErrorBoundary>
    );

    expect(screen.queryByTestId("chunk-error-ui")).not.toBeInTheDocument();
    expect(screen.getByTestId("generic-fallback")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Retry / reload behaviour
// ---------------------------------------------------------------------------

describe("ChunkErrorBoundary – reload on retry", () => {
  let restore: () => void;

  beforeEach(() => {
    restore = suppressReactErrorLogs();
  });

  afterEach(() => {
    restore();
    vi.restoreAllMocks();
  });

  it("calls window.location.reload when the Reload button is clicked", () => {
    const reloadSpy = vi.fn();
    // jsdom doesn't implement reload; replace it
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });

    const chunkError = Object.assign(new Error("Loading chunk 1 failed."), {
      name: "ChunkLoadError",
    });

    render(
      <ChunkErrorBoundary>
        <PanickingChild error={chunkError} />
      </ChunkErrorBoundary>
    );

    fireEvent.click(screen.getByRole("button", { name: /reload page/i }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Happy path – children render normally when no error occurs
// ---------------------------------------------------------------------------

describe("ChunkErrorBoundary – happy path", () => {
  it("renders children when no error is thrown", () => {
    render(
      <ChunkErrorBoundary>
        <div data-testid="safe-child">Hello</div>
      </ChunkErrorBoundary>
    );

    expect(screen.getByTestId("safe-child")).toBeInTheDocument();
    expect(screen.queryByTestId("chunk-error-ui")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Integration: lazy-loaded route simulation
// ---------------------------------------------------------------------------

describe("ChunkErrorBoundary – lazy route integration", () => {
  let restore: () => void;

  beforeEach(() => {
    restore = suppressReactErrorLogs();
  });

  afterEach(() => {
    restore();
    vi.restoreAllMocks();
  });

  it("catches a rejection from a lazy() import and shows retry UI", async () => {
    // Simulate a chunk-load failure as a rejected dynamic import
    const chunkError = Object.assign(
      new Error("Failed to fetch dynamically imported module: /routes/Foo.js"),
      { name: "ChunkLoadError" }
    );

    const BrokenLazy = lazy(() => Promise.reject(chunkError));

    render(
      <ChunkErrorBoundary>
        <Suspense fallback={<div data-testid="suspense-fallback" />}>
          <BrokenLazy />
        </Suspense>
      </ChunkErrorBoundary>
    );

    // Suspense fallback shows first
    expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();

    // After the promise rejects, boundary should catch and show retry UI
    await waitFor(() =>
      expect(screen.getByTestId("chunk-error-ui")).toBeInTheDocument()
    );

    expect(
      screen.getByRole("button", { name: /reload page/i })
    ).toBeInTheDocument();
  });
});