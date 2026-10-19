import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React, { lazy } from "react";
import { FeatureBoundary } from "../FeatureBoundary";

describe("FeatureBoundary", () => {
  it("renders loadingFallback while children are loading", async () => {
    // A lazy component that never resolves to keep it in a loading state
    const LazyComponent = lazy(() => new Promise(() => {}));
    
    render(
      <FeatureBoundary loadingFallback={<div data-testid="loading" />}>
        <LazyComponent />
      </FeatureBoundary>
    );

    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("renders children when loaded", async () => {
    const Component = () => <div>Hello World</div>;
    
    render(
      <FeatureBoundary loadingFallback={<div data-testid="loading" />}>
        <Component />
      </FeatureBoundary>
    );

    expect(await screen.findByText("Hello World")).toBeInTheDocument();
    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
  });

  it("renders errorFallback when a non-chunk error occurs", async () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    // Suppress console.error in test
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <FeatureBoundary
        loadingFallback={<div data-testid="loading" />}
        errorFallback={<div data-testid="error-fallback" />}
      >
        <ThrowError />
      </FeatureBoundary>
    );

    expect(await screen.findByTestId("error-fallback")).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
