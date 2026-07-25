/**
 * Unit tests for useTransactionStatus — the send-confirmation poller.
 *
 * Covers backoff scheduling, terminal stop (confirmed/failed), the attempt
 * budget → `unknown` timeout, transient-error retry, session-expiry stop,
 * disabled/idle, and abort-on-unmount cleanup. Pure helpers are tested directly
 * for branch coverage.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/client/apiClient";
import {
  getTransactionStatusUrl,
  mapApiStatusToLifecycle,
  nextBackoffDelay,
  useTransactionStatus,
} from "@/useTransactionStatus";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
describe("mapApiStatusToLifecycle", () => {
  it("maps terminal success variants to 'confirmed'", () => {
    expect(mapApiStatusToLifecycle("completed")).toBe("confirmed");
    expect(mapApiStatusToLifecycle("success")).toBe("confirmed");
    expect(mapApiStatusToLifecycle("confirmed")).toBe("confirmed");
  });

  it("maps 'failed' to 'failed'", () => {
    expect(mapApiStatusToLifecycle("failed")).toBe("failed");
  });

  it("returns null for non-terminal / unknown statuses (keep polling)", () => {
    expect(mapApiStatusToLifecycle("pending")).toBeNull();
    expect(mapApiStatusToLifecycle("not_found")).toBeNull();
    expect(mapApiStatusToLifecycle(undefined)).toBeNull();
    expect(mapApiStatusToLifecycle("")).toBeNull();
  });
});

describe("nextBackoffDelay", () => {
  it("doubles per attempt and caps at the max", () => {
    expect(nextBackoffDelay(0, 1000, 30000)).toBe(1000);
    expect(nextBackoffDelay(1, 1000, 30000)).toBe(2000);
    expect(nextBackoffDelay(2, 1000, 30000)).toBe(4000);
    expect(nextBackoffDelay(5, 1000, 30000)).toBe(30000); // 32000 capped
  });

  it("clamps negative attempts to the base delay", () => {
    expect(nextBackoffDelay(-3, 1000, 30000)).toBe(1000);
  });
});

describe("getTransactionStatusUrl", () => {
  it("targets the v1 status endpoint with an encoded hash", () => {
    expect(getTransactionStatusUrl("abc123")).toBe(
      "/api/v1/remittance/status/abc123",
    );
    expect(getTransactionStatusUrl("a/b")).toBe(
      "/api/v1/remittance/status/a%2Fb",
    );
  });
});

// ---------------------------------------------------------------------------
// Hook behaviour
// ---------------------------------------------------------------------------
describe("useTransactionStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("stays idle and does not poll without a hash", () => {
    const get = vi.spyOn(apiClient, "get");
    const { result } = renderHook(() => useTransactionStatus(null));
    expect(result.current.status).toBe("idle");
    expect(result.current.isPolling).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });

  it("stays idle when disabled", () => {
    const get = vi.spyOn(apiClient, "get");
    const { result } = renderHook(() =>
      useTransactionStatus("abc", { enabled: false }),
    );
    expect(result.current.status).toBe("idle");
    expect(get).not.toHaveBeenCalled();
  });

  it("resolves to 'confirmed' on the first successful poll", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(
      jsonResponse({ hash: "abc", status: "completed" }),
    );
    const { result } = renderHook(() =>
      useTransactionStatus("abc", { baseDelayMs: 10, maxDelayMs: 50, maxAttempts: 5 }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("confirmed");
    expect(result.current.isPolling).toBe(false);
    expect(result.current.attempts).toBe(1);
  });

  it("resolves to 'failed' for a failed transaction", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(
      jsonResponse({ status: "failed" }),
    );
    const { result } = renderHook(() =>
      useTransactionStatus("abc", { baseDelayMs: 10 }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("failed");
    expect(result.current.isPolling).toBe(false);
  });

  it("keeps polling with backoff until a terminal state is reached", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValueOnce(jsonResponse({ status: "not_found" }))
      .mockResolvedValueOnce(jsonResponse({ status: "completed" }));

    const { result } = renderHook(() =>
      useTransactionStatus("abc", { baseDelayMs: 10, maxDelayMs: 50, maxAttempts: 5 }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe("pending");
    expect(result.current.attempts).toBe(1);
    expect(result.current.isPolling).toBe(true);

    // Backoff for attempt 2 = baseDelay (10ms).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.status).toBe("confirmed");
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("records a transient error and retries", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce(jsonResponse({ status: "completed" }));

    const { result } = renderHook(() =>
      useTransactionStatus("abc", { baseDelayMs: 10, maxAttempts: 5 }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe("pending");
    expect(result.current.error).toBe("network blip");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.status).toBe("confirmed");
    expect(result.current.error).toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("gives up to 'unknown' after exhausting the attempt budget", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(
      jsonResponse({ status: "not_found" }),
    );

    const { result } = renderHook(() =>
      useTransactionStatus("abc", { baseDelayMs: 10, maxDelayMs: 20, maxAttempts: 3 }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0); // attempt 1
    });
    expect(result.current.attempts).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10); // attempt 2
    });
    expect(result.current.attempts).toBe(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20); // attempt 3 → budget exhausted
    });
    expect(result.current.status).toBe("unknown");
    expect(result.current.isPolling).toBe(false);
    expect(result.current.attempts).toBe(3);
  });

  it("stops polling when the session-expiry flow returns null", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(null);

    const { result } = renderHook(() =>
      useTransactionStatus("abc", { baseDelayMs: 10 }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.isPolling).toBe(false);
    expect(result.current.error).toBe("session_expired");
    expect(result.current.status).toBe("pending");
  });

  it("treats a non-OK response as transient", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(
      jsonResponse({ error: "boom" }, 500),
    );

    const { result } = renderHook(() =>
      useTransactionStatus("abc", { baseDelayMs: 10, maxAttempts: 5 }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("pending");
    expect(result.current.error).toBe("status_500");
  });

  it("aborts polling and schedules no further attempts on unmount", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue(jsonResponse({ status: "not_found" }));

    const { result, unmount } = renderHook(() =>
      useTransactionStatus("abc", { baseDelayMs: 10, maxAttempts: 5 }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.attempts).toBe(1);

    const callsBeforeUnmount = get.mock.calls.length;
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // No new requests after unmount — the timer was cleared and request aborted.
    expect(get.mock.calls.length).toBe(callsBeforeUnmount);
  });
});
