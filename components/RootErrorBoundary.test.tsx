import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RootErrorBoundary from "@/components/RootErrorBoundary";

const captureException = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

function Thrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Boom");
  }

  return <div>Recovered content</div>;
}

describe("RootErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    Object.defineProperty(window.navigator, "language", {
      value: "en-US",
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an accessible fallback and captures render errors with Sentry", () => {
    render(
      <RootErrorBoundary>
        <Thrower shouldThrow />
      </RootErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Something went wrong" })
    ).toHaveFocus();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException.mock.calls[0][0]).toEqual(expect.any(Error));
    expect(captureException.mock.calls[0][1]).toMatchObject({
      tags: { boundary: "root" },
    });
  });

  it("does not crash the fallback when Sentry capture fails", () => {
    captureException.mockImplementationOnce(() => {
      throw new Error("Sentry unavailable");
    });

    render(
      <RootErrorBoundary>
        <Thrower shouldThrow />
      </RootErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("uses a key-based reset to remount the protected subtree", () => {
    let shouldThrow = true;
    let constructorCount = 0;

    class MountProbe extends React.Component {
      constructor(props: Record<string, never>) {
        super(props);
        constructorCount += 1;
      }

      render() {
        return <div>Probe</div>;
      }
    }

    function DynamicThrower() {
      if (shouldThrow) {
        throw new Error("Initial render failed");
      }

      return <div>Recovered content</div>;
    }

    render(
      <RootErrorBoundary>
        <MountProbe />
        <DynamicThrower />
      </RootErrorBoundary>
    );

    const countBeforeReset = constructorCount;
    expect(countBeforeReset).toBeGreaterThan(0);
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    expect(constructorCount).toBeGreaterThan(countBeforeReset);
  });

  it("keeps the fallback available if retry renders another error", () => {
    render(
      <RootErrorBoundary>
        <Thrower shouldThrow />
      </RootErrorBoundary>
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(captureException).toHaveBeenCalledTimes(2);
  });

  it("localizes fallback copy in Spanish", async () => {
    Object.defineProperty(window.navigator, "language", {
      value: "es-ES",
      configurable: true,
    });

    render(
      <RootErrorBoundary>
        <Thrower shouldThrow />
      </RootErrorBoundary>
    );

    expect(await screen.findByRole("heading", { name: "Algo salio mal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Intentar de nuevo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
  });
});
