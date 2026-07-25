/**
 * Tests for the network-error soft-error toast feature (#924).
 *
 * Covers:
 * - `dispatchNetworkError` utility (event construction + SSR guard)
 * - `useNetworkErrorToast` hook (event → toast pipeline)
 * - `NetworkErrorToastProvider` component (mounts the hook, renders null)
 * - Toast message content, action button, and isTimeout description
 */

import React from "react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ToastProvider } from "@/lib/context/ToastContext";
import ToastRegion from "@/components/ToastRegion";
import {
  dispatchNetworkError,
  NETWORK_ERROR_EVENT,
} from "@/lib/client/networkErrorEvent";
import NetworkErrorToastProvider, {
  useNetworkErrorToast,
} from "@/lib/hooks/useNetworkErrorToast";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Renders `NetworkErrorToastProvider` and `ToastRegion` inside `ToastProvider`
 * so the full hook → context → render pipeline is active.
 */
function renderWithToasts() {
  return render(
    <ToastProvider>
      <NetworkErrorToastProvider />
      <ToastRegion />
    </ToastProvider>
  );
}

/**
 * Dispatch a synthetic `network-error` event and return the retry mock.
 */
function fire(overrides: Partial<{ url: string; isTimeout: boolean }> = {}): () => void {
  const retry = vi.fn();
  act(() => {
    dispatchNetworkError({
      url: overrides.url ?? "/api/test",
      retry,
      isTimeout: overrides.isTimeout ?? false,
    });
  });
  return retry;
}

// ---------------------------------------------------------------------------
// dispatchNetworkError unit tests
// ---------------------------------------------------------------------------

describe("dispatchNetworkError", () => {
  it("dispatches a CustomEvent with the correct type", () => {
    const handler = vi.fn();
    window.addEventListener(NETWORK_ERROR_EVENT, handler);
    try {
      dispatchNetworkError({ url: "/api/x", retry: vi.fn(), isTimeout: false });
      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0][0] as CustomEvent).type).toBe("network-error");
    } finally {
      window.removeEventListener(NETWORK_ERROR_EVENT, handler);
    }
  });

  it("includes url, retry, and isTimeout in the event detail", () => {
    const handler = vi.fn();
    const retry = vi.fn();
    window.addEventListener(NETWORK_ERROR_EVENT, handler);
    try {
      dispatchNetworkError({ url: "/api/send", retry, isTimeout: true });
      const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.url).toBe("/api/send");
      expect(detail.retry).toBe(retry);
      expect(detail.isTimeout).toBe(true);
    } finally {
      window.removeEventListener(NETWORK_ERROR_EVENT, handler);
    }
  });

  it("is a no-op when window is undefined (SSR guard)", () => {
    const original = global.window;
    // @ts-expect-error intentional deletion for SSR simulation
    delete global.window;
    // Should not throw
    expect(() =>
      dispatchNetworkError({ url: "/api/x", retry: vi.fn(), isTimeout: false })
    ).not.toThrow();
    global.window = original;
  });
});

// ---------------------------------------------------------------------------
// useNetworkErrorToast → toast rendering
// ---------------------------------------------------------------------------

describe("useNetworkErrorToast – toast content", () => {
  beforeEach(() => {
    renderWithToasts();
  });

  it('shows "Something went wrong. Retry?" toast on network-error event', () => {
    fire();
    expect(
      screen.getByText("Something went wrong. Retry?")
    ).toBeInTheDocument();
  });

  it("renders an inline Retry action button", () => {
    fire();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("calls the retry callback when the Retry button is clicked", () => {
    const retry = fire();
    const retryBtn = screen.getByRole("button", { name: "Retry" });
    fireEvent.click(retryBtn);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows "The request timed out." description when isTimeout is true', () => {
    fire({ isTimeout: true });
    expect(screen.getByText("The request timed out.")).toBeInTheDocument();
  });

  it("does not show a timeout description when isTimeout is false", () => {
    fire({ isTimeout: false });
    expect(screen.queryByText("The request timed out.")).toBeNull();
  });

  it("toast variant is error (error border class)", () => {
    fire();
    // The toast panel element should carry the error border token class.
    const toastPanel = screen
      .getByText("Something went wrong. Retry?")
      .closest("[role='status']");
    expect(toastPanel?.className).toMatch(/border-status-error-border/);
  });

  it("shows a dismiss button so the user can close the toast", () => {
    fire();
    expect(
      screen.getByRole("button", { name: "Dismiss notification" })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// useNetworkErrorToast – listener lifecycle
// ---------------------------------------------------------------------------

describe("useNetworkErrorToast – listener lifecycle", () => {
  it("adds and removes the window event listener on mount/unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(
      <ToastProvider>
        <NetworkErrorToastProvider />
        <ToastRegion />
      </ToastProvider>
    );

    // Check that our specific event type was registered.
    const addCalls = addSpy.mock.calls.filter(([type]) => type === NETWORK_ERROR_EVENT);
    expect(addCalls).toHaveLength(1);

    unmount();

    const removeCalls = removeSpy.mock.calls.filter(([type]) => type === NETWORK_ERROR_EVENT);
    expect(removeCalls).toHaveLength(1);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("does not show a toast after the component unmounts", () => {
    const { unmount } = renderWithToasts();
    unmount();
    act(() => {
      dispatchNetworkError({ url: "/api/test", retry: vi.fn(), isTimeout: false });
    });
    expect(screen.queryByText("Something went wrong. Retry?")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// NetworkErrorToastProvider component
// ---------------------------------------------------------------------------

describe("NetworkErrorToastProvider", () => {
  it("renders null (no visible DOM node)", () => {
    const { container } = render(
      <ToastProvider>
        <NetworkErrorToastProvider />
      </ToastProvider>
    );
    // The component itself produces no DOM output.
    expect(container.firstChild).toBeNull();
  });
});
