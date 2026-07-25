/**
 * Tests for apiClient network-error event dispatch (#924) and
 * the 30 s client-side outer request timeout (#978).
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { apiClient } from "../../lib/client/apiClient";
import { sessionHandler } from "../../lib/client/sessionHandler";
import { NETWORK_ERROR_EVENT } from "../../lib/client/networkErrorEvent";
import type { NetworkErrorDetail } from "../../lib/client/networkErrorEvent";

// Mock sessionHandler so tests focus on timeout + event dispatch behavior.
vi.mock("../../lib/client/sessionHandler", () => ({
  sessionHandler: {
    isSessionExpired: vi.fn(),
    refreshSession: vi.fn(),
    handleSessionExpiry: vi.fn(),
  },
}));

const noHeaders = { get: () => null };

/** Fetch mock that hangs until the supplied signal is aborted. */
function hangingFetch() {
  return vi.fn(
    (_url: string, opts: RequestInit) =>
      new Promise((_resolve, reject) => {
        const signal = opts.signal as AbortSignal;
        signal.addEventListener("abort", () =>
          reject(
            signal.reason ??
              new DOMException("The operation was aborted.", "AbortError")
          )
        );
      })
  );
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  vi.clearAllMocks();
  (sessionHandler.isSessionExpired as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  (sessionHandler.refreshSession as ReturnType<typeof vi.fn>).mockResolvedValue(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// #924: network-error event dispatch on transport failure
// ---------------------------------------------------------------------------

describe("apiClient – network-error event dispatch (#924)", () => {
  it("dispatches network-error when all retries are exhausted on a network failure", async () => {
    (fetch as any).mockRejectedValue(new Error("network down"));

    const events: NetworkErrorDetail[] = [];
    const handler = (e: Event) =>
      events.push((e as CustomEvent<NetworkErrorDetail>).detail);
    window.addEventListener(NETWORK_ERROR_EVENT, handler);

    try {
      await expect(
        apiClient.get("/api/test", { retries: 0, backoff: 1 })
      ).rejects.toThrow("network down");
    } finally {
      window.removeEventListener(NETWORK_ERROR_EVENT, handler);
    }

    expect(events).toHaveLength(1);
    expect(events[0].url).toBe("/api/test");
    expect(typeof events[0].retry).toBe("function");
    expect(events[0].isTimeout).toBe(false);
  });

  it("dispatches network-error with isTimeout: true on a TimeoutError DOMException", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch());

    const events: NetworkErrorDetail[] = [];
    const handler = (e: Event) =>
      events.push((e as CustomEvent<NetworkErrorDetail>).detail);
    window.addEventListener(NETWORK_ERROR_EVENT, handler);

    const promise = apiClient.get("/api/slow", {
      timeout: 100,
      retries: 0,
    });
    const assertion = expect(promise).rejects.toMatchObject({ name: "TimeoutError" });

    await vi.advanceTimersByTimeAsync(200);
    await assertion;

    window.removeEventListener(NETWORK_ERROR_EVENT, handler);

    expect(events).toHaveLength(1);
    expect(events[0].isTimeout).toBe(true);
    expect(events[0].url).toBe("/api/slow");
  });

  it("dispatches network-error with isTimeout: false for a generic network error", async () => {
    (fetch as any).mockRejectedValue(new TypeError("Failed to fetch"));

    const events: NetworkErrorDetail[] = [];
    const handler = (e: Event) =>
      events.push((e as CustomEvent<NetworkErrorDetail>).detail);
    window.addEventListener(NETWORK_ERROR_EVENT, handler);

    try {
      await expect(
        apiClient.post("/api/send", { body: "{}", retries: 0 })
      ).rejects.toThrow("Failed to fetch");
    } finally {
      window.removeEventListener(NETWORK_ERROR_EVENT, handler);
    }

    expect(events).toHaveLength(1);
    expect(events[0].isTimeout).toBe(false);
  });

  it("does NOT dispatch network-error when a session expiry is detected", async () => {
    (fetch as any).mockResolvedValue({ status: 401, headers: noHeaders });
    (sessionHandler.isSessionExpired as any).mockResolvedValue(true);
    (sessionHandler.refreshSession as any).mockResolvedValue(false);

    const events: NetworkErrorDetail[] = [];
    const handler = (e: Event) =>
      events.push((e as CustomEvent<NetworkErrorDetail>).detail);
    window.addEventListener(NETWORK_ERROR_EVENT, handler);

    const response = await apiClient.get("/api/test", { retries: 0 });

    window.removeEventListener(NETWORK_ERROR_EVENT, handler);

    // Session expiry returns null without throwing, so no network-error event.
    expect(response).toBeNull();
    expect(events).toHaveLength(0);
  });

  it("does NOT dispatch network-error for a successful response", async () => {
    (fetch as any).mockResolvedValue({ status: 200, headers: noHeaders });

    const events: NetworkErrorDetail[] = [];
    const handler = (e: Event) =>
      events.push((e as CustomEvent<NetworkErrorDetail>).detail);
    window.addEventListener(NETWORK_ERROR_EVENT, handler);

    const response = await apiClient.get("/api/test", { retries: 0 });

    window.removeEventListener(NETWORK_ERROR_EVENT, handler);

    expect(response?.status).toBe(200);
    expect(events).toHaveLength(0);
  });

  it("does NOT dispatch network-error for a non-OK HTTP response (4xx / 5xx returned)", async () => {
    // 5xx is returned (not thrown) once retries are exhausted.
    (fetch as any).mockResolvedValue({ status: 500, headers: noHeaders });

    const events: NetworkErrorDetail[] = [];
    const handler = (e: Event) =>
      events.push((e as CustomEvent<NetworkErrorDetail>).detail);
    window.addEventListener(NETWORK_ERROR_EVENT, handler);

    const response = await apiClient.get("/api/test", { retries: 0 });

    window.removeEventListener(NETWORK_ERROR_EVENT, handler);

    // 5xx is returned as a response, not thrown — no event.
    expect(response?.status).toBe(500);
    expect(events).toHaveLength(0);
  });

  it("provides a retry callback that re-issues the same request", async () => {
    // First call fails; second succeeds.
    (fetch as any)
      .mockRejectedValueOnce(new Error("flaky"))
      .mockResolvedValueOnce({ status: 200, headers: noHeaders });

    const events: NetworkErrorDetail[] = [];
    const handler = (e: Event) =>
      events.push((e as CustomEvent<NetworkErrorDetail>).detail);
    window.addEventListener(NETWORK_ERROR_EVENT, handler);

    await expect(
      apiClient.get("/api/test", { retries: 0 })
    ).rejects.toThrow("flaky");

    window.removeEventListener(NETWORK_ERROR_EVENT, handler);

    expect(events).toHaveLength(1);

    // Calling retry should trigger a new request.
    (sessionHandler.isSessionExpired as any).mockResolvedValue(false);
    const retryResult = events[0].retry();
    // retry() is fire-and-forget (void), but the second fetch should be called.
    await new Promise((r) => setTimeout(r, 50)); // let the microtask queue drain
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// #978: 30 s outer client request timeout
// ---------------------------------------------------------------------------

describe("apiClient – 30 s outer request timeout (#978)", () => {
  it("aborts a request that exceeds the 30 s outer budget", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch());

    const promise = apiClient.get("/api/very-slow", {
      timeout: 0,        // disable per-attempt timeout so only outer fires
      retries: 0,
      requestTimeout: 30_000,
    });
    const assertion = expect(promise).rejects.toMatchObject({ name: /AbortError|TimeoutError/ });

    await vi.advanceTimersByTimeAsync(30_001);
    await assertion;
  });

  it("does not abort when the request completes before the 30 s budget", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, _opts: RequestInit) =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ status: 200, headers: noHeaders } as Response), 5_000);
        })
      )
    );

    const promise = apiClient.get("/api/fast", {
      timeout: 0,
      retries: 0,
      requestTimeout: 30_000,
    });
    await vi.advanceTimersByTimeAsync(5_001);
    const response = await promise;
    expect(response?.status).toBe(200);
  });

  it("custom requestTimeout of 5 s fires before the default 30 s", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch());

    const promise = apiClient.get("/api/custom", {
      timeout: 0,
      retries: 0,
      requestTimeout: 5_000,
    });
    const assertion = expect(promise).rejects.toBeDefined();

    await vi.advanceTimersByTimeAsync(5_001);
    await assertion;
    // Should NOT need to wait 30 s.
  });

  it("setting requestTimeout: 0 disables the outer guard entirely", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, opts: RequestInit) =>
        new Promise((resolve, reject) => {
          const signal = opts.signal as AbortSignal;
          signal.addEventListener("abort", () => reject(signal.reason));
          // Resolve after 60 s — beyond the normal 30 s guard.
          setTimeout(
            () => resolve({ status: 200, headers: noHeaders } as Response),
            60_000
          );
        })
      )
    );

    const promise = apiClient.get("/api/very-patient", {
      timeout: 0,
      retries: 0,
      requestTimeout: 0, // disable outer guard
    });
    // Advance 35 s — the 30 s guard should NOT have fired.
    await vi.advanceTimersByTimeAsync(35_000);
    // Advance to the resolve point.
    await vi.advanceTimersByTimeAsync(25_001);
    const response = await promise;
    expect(response?.status).toBe(200);
  });

  it("dispatches a network-error event when the outer budget expires", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch());

    const events: NetworkErrorDetail[] = [];
    const handler = (e: Event) =>
      events.push((e as CustomEvent<NetworkErrorDetail>).detail);
    window.addEventListener(NETWORK_ERROR_EVENT, handler);

    const promise = apiClient.get("/api/budget", {
      timeout: 0,
      retries: 0,
      requestTimeout: 30_000,
    });
    const assertion = expect(promise).rejects.toBeDefined();

    await vi.advanceTimersByTimeAsync(30_001);
    await assertion;

    window.removeEventListener(NETWORK_ERROR_EVENT, handler);

    expect(events).toHaveLength(1);
    expect(events[0].url).toBe("/api/budget");
  });
});

// ---------------------------------------------------------------------------
// CLIENT_REQUEST_TIMEOUT_MS constant
// ---------------------------------------------------------------------------

describe("CLIENT_REQUEST_TIMEOUT_MS constant", () => {
  it("exports CLIENT_REQUEST_TIMEOUT_MS = 30_000 from fetch-timeouts config", async () => {
    const { CLIENT_REQUEST_TIMEOUT_MS } = await import(
      "../../lib/config/fetch-timeouts"
    );
    expect(CLIENT_REQUEST_TIMEOUT_MS).toBe(30_000);
  });
});
