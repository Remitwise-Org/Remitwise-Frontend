import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { WhatsNewProvider, useWhatsNew } from "@/lib/context/WhatsNewContext";

describe("WhatsNewContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("opens the panel on first visit when no localStorage entry exists", () => {
    const { result } = renderHook(() => useWhatsNew(), {
      wrapper: ({ children }) => <WhatsNewProvider>{children}</WhatsNewProvider>,
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("does not open the panel when localStorage has a last seen entry", () => {
    localStorage.setItem("remitwise_whats_new_last_seen", "v1.0.0");

    const { result } = renderHook(() => useWhatsNew(), {
      wrapper: ({ children }) => <WhatsNewProvider>{children}</WhatsNewProvider>,
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("marks all as read and stores the newest entry ID", () => {
    const { result } = renderHook(() => useWhatsNew(), {
      wrapper: ({ children }) => <WhatsNewProvider>{children}</WhatsNewProvider>,
    });

    act(() => {
      result.current.markAllRead();
    });

    expect(localStorage.getItem("remitwise_whats_new_last_seen")).toBe("v1.4.0");
  });

  it("replay clears localStorage and opens the panel", () => {
    localStorage.setItem("remitwise_whats_new_last_seen", "v1.0.0");

    const { result } = renderHook(() => useWhatsNew(), {
      wrapper: ({ children }) => <WhatsNewProvider>{children}</WhatsNewProvider>,
    });

    expect(result.current.isOpen).toBe(false);
    expect(localStorage.getItem("remitwise_whats_new_last_seen")).toBe("v1.0.0");

    act(() => {
      result.current.replay();
    });

    expect(result.current.isOpen).toBe(true);
    // Note: The panel auto-marks as read when opened, so localStorage gets set again
    expect(localStorage.getItem("remitwise_whats_new_last_seen")).toBe("v1.4.0");
  });

  it("replay opens the panel even when no localStorage entry exists", () => {
    const { result } = renderHook(() => useWhatsNew(), {
      wrapper: ({ children }) => <WhatsNewProvider>{children}</WhatsNewProvider>,
    });

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.replay();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("toggle switches the panel open state", () => {
    const { result } = renderHook(() => useWhatsNew(), {
      wrapper: ({ children }) => <WhatsNewProvider>{children}</WhatsNewProvider>,
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("throws when useWhatsNew is used outside of WhatsNewProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useWhatsNew())).toThrow(
      "useWhatsNew must be used within a WhatsNewProvider",
    );

    consoleSpy.mockRestore();
  });
});
