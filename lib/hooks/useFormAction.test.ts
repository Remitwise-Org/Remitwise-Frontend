import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { } from "vitest";
import { useFormAction } from "./useFormAction";
import { apiClient } from "@/lib/client/apiClient";

type TestState = {
  error?: string;
  success?: string;
  validationErrors?: Array<{ path: string; message: string }>;
  policyName?: string;
};

const flushPromises = () => new Promise<void>((r) => setTimeout(r, 0));

// ---------------------------------------------------------------------------
// Minimal hook harness using createRoot (no @testing-library/react needed)
// ---------------------------------------------------------------------------
function createHookHarness(url = "/api/test") {
  let captured: readonly [TestState, (fd: FormData) => void, boolean] | undefined;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container) as Root;

  function TestComponent() {
    const hook = useFormAction<TestState>(url);
    captured = hook;
    return null;
  }

  act(() => {
    root.render(React.createElement(TestComponent));
  });

  return {
    get hook() {
      return captured!;
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useFormAction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  // ── Idle state ──────────────────────────────────────────────────────────
  it("starts in an idle empty state", () => {
    const harness = createHookHarness();
    try {
      expect(harness.hook[0]).toEqual({});
      expect(harness.hook[2]).toBe(false); // isPending
    } finally {
      harness.unmount();
    }
  });

  // ── Success transitions ─────────────────────────────────────────────────
  it("idle → submitting → success: sets state from JSON payload", async () => {
    vi.spyOn(apiClient, "request").mockResolvedValueOnce(
      jsonResponse({ success: "Policy created", policyName: "Health Plan" })
    );

    const harness = createHookHarness();
    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });
      expect(harness.hook[0]).toMatchObject({
        success: "Policy created",
        policyName: "Health Plan",
      });
    } finally {
      harness.unmount();
    }
  });

  it("sets default success message when response body is empty", async () => {
    vi.spyOn(apiClient, "request").mockResolvedValueOnce(
      new Response("", { status: 200 })
    );

    const harness = createHookHarness();
    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });
      expect(harness.hook[0]).toMatchObject({
        success: "Request completed successfully.",
      });
    } finally {
      harness.unmount();
    }
  });

  it("wraps a plain-text response body in a success field", async () => {
    vi.spyOn(apiClient, "request").mockResolvedValueOnce(
      new Response("OK", { status: 200 })
    );

    const harness = createHookHarness();
    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });
      expect(harness.hook[0]).toMatchObject({ success: "OK" });
    } finally {
      harness.unmount();
    }
  });

  // ── Success then reset ───────────────────────────────────────────────────
  it("success → second submit → new success overwrites previous state", async () => {
    vi.spyOn(apiClient, "request")
      .mockResolvedValueOnce(jsonResponse({ success: "First" }))
      .mockResolvedValueOnce(jsonResponse({ success: "Second" }));

    const harness = createHookHarness();
    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });
      expect(harness.hook[0]).toMatchObject({ success: "First" });

      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });
      expect(harness.hook[0]).toMatchObject({ success: "Second" });
    } finally {
      harness.unmount();
    }
  });

  // ── Error transitions ────────────────────────────────────────────────────
  it("surfaces typed ApiErrorResponse message for 4xx responses", async () => {
    vi.spyOn(apiClient, "request").mockResolvedValueOnce(
      jsonResponse(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Policy name is required" } },
        422
      )
    );

    const harness = createHookHarness();
    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });
      expect(harness.hook[0]).toMatchObject({ error: "Policy name is required" });
    } finally {
      harness.unmount();
    }
  });

  it("surfaces typed ApiErrorResponse message for 5xx responses", async () => {
    vi.spyOn(apiClient, "request").mockResolvedValueOnce(
      jsonResponse(
        { success: false, error: { code: "INTERNAL_ERROR", message: "Service unavailable" } },
        503
      )
    );

    const harness = createHookHarness();
    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });
      expect(harness.hook[0]).toMatchObject({ error: "Service unavailable" });
    } finally {
      harness.unmount();
    }
  });

  it("includes validationErrors array on the state for 400 validation failures", async () => {
    const validationErrors = [
      { path: "name", message: "Name is required" },
      { path: "amount", message: "Amount must be positive" },
    ];
    vi.spyOn(apiClient, "request").mockResolvedValueOnce(
      jsonResponse({ success: false, validationErrors }, 400)
    );

    const harness = createHookHarness();
    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });
      expect(harness.hook[0]).toMatchObject({
        error: "Name is required",
        validationErrors,
      });
    } finally {
      harness.unmount();
    }
  });

  it("falls back to status-based message when error body has no message", async () => {
    vi.spyOn(apiClient, "request").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    const harness = createHookHarness();
    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });
      expect(harness.hook[0]).toMatchObject({
        error: "Request failed with status 404",
      });
    } finally {
      harness.unmount();
    }
  });

  it("sets generic error when payload has success:false but no error message", async () => {
    vi.spyOn(apiClient, "request").mockResolvedValueOnce(
      jsonResponse({ success: false }, 200)
    );

    const harness = createHookHarness();
    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });
      expect(harness.hook[0]).toMatchObject({
        error: "The server returned an error response.",
      });
    } finally {
      harness.unmount();
    }
  });

  it("sets network error message when the request rejects", async () => {
    vi.spyOn(apiClient, "request").mockRejectedValueOnce(new Error("offline"));

    const harness = createHookHarness();
    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });
      expect(harness.hook[0]).toMatchObject({
        error: "Network error. Please try again.",
      });
    } finally {
      harness.unmount();
    }
  });

  // ── null response (session expiry) ───────────────────────────────────────
  it("does not set state when apiClient returns null (session expiry flow)", async () => {
    vi.spyOn(apiClient, "request").mockResolvedValueOnce(null as unknown as Response);

    const harness = createHookHarness();
    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });
      // State must remain at the initial empty object — no error or success set.
      expect(harness.hook[0]).toEqual({});
    } finally {
      harness.unmount();
    }
  });

  // ── Double-submit / latest-wins ──────────────────────────────────────────
  it("aborts previous request on rapid double-submit (latest wins)", async () => {
    const abortSpy = vi.fn();
    let resolveFirst!: (v: Response) => void;
    const firstRequest = new Promise<Response>((res) => {
      resolveFirst = res;
    });

    vi.spyOn(apiClient, "request")
      .mockImplementationOnce((_url, opts) => {
        opts?.signal?.addEventListener("abort", abortSpy);
        return firstRequest;
      })
      .mockResolvedValueOnce(jsonResponse({ success: "Second submission succeeded" }));

    const harness = createHookHarness();
    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });

      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });

      expect(abortSpy).toHaveBeenCalled();

      // Resolve the first (stale) request — its result must be discarded.
      act(() => {
        resolveFirst(jsonResponse({ success: "First submission succeeded" }));
      });
      await act(async () => {
        await flushPromises();
      });

      expect(harness.hook[0]).toMatchObject({ success: "Second submission succeeded" });
    } finally {
      harness.unmount();
    }
  });

  // ── Cancel on unmount ────────────────────────────────────────────────────
  it("does not set state after unmount mid-submit", async () => {
    let resolveRequest!: (v: Response) => void;
    const pendingRequest = new Promise<Response>((res) => {
      resolveRequest = res;
    });

    vi.spyOn(apiClient, "request").mockReturnValueOnce(pendingRequest);

    const harness = createHookHarness();

    await act(async () => {
      harness.hook[1](new FormData());
      await flushPromises();
    });

    // Unmount before the request resolves.
    harness.unmount();

    // Resolving after unmount must not throw and must not call setState.
    await act(async () => {
      resolveRequest(jsonResponse({ success: "Late response" }));
      await flushPromises();
    });

    // No React warning about setState on unmounted component expected.
    // If the mountedRef guard is missing this test throws in CI.
  });

  it("aborts the AbortController signal on unmount", async () => {
    const abortSpy = vi.fn();
    let capturedSignal: AbortSignal | undefined;

    vi.spyOn(apiClient, "request").mockImplementationOnce((_url, opts) => {
      capturedSignal = opts?.signal as AbortSignal | undefined;
      capturedSignal?.addEventListener("abort", abortSpy);
      return new Promise(() => {}); // never resolves
    });

    const harness = createHookHarness();

    await act(async () => {
      harness.hook[1](new FormData());
      await flushPromises();
    });

    harness.unmount();

    await flushPromises();
    expect(abortSpy).toHaveBeenCalled();
  });

  // ── Abort then re-submit ──────────────────────────────────────────────────
  it("can re-submit successfully after a prior abort", async () => {
    let resolveFirst!: (v: Response) => void;
    const firstPending = new Promise<Response>((res) => {
      resolveFirst = res;
    });

    vi.spyOn(apiClient, "request")
      .mockReturnValueOnce(firstPending)
      .mockResolvedValueOnce(jsonResponse({ success: "After abort" }));

    const harness = createHookHarness();
    try {
      // First submit — intentionally left pending.
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });

      // Second submit aborts the first and completes.
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });

      // Discard stale first response.
      act(() => resolveFirst(jsonResponse({ success: "Should be ignored" })));
      await act(async () => {
        await flushPromises();
      });

      expect(harness.hook[0]).toMatchObject({ success: "After abort" });
    } finally {
      harness.unmount();
    }
  });

  // ── API surface ──────────────────────────────────────────────────────────
  it("returns a stable [state, formAction, isPending] tuple", () => {
    const harness = createHookHarness();
    try {
      const [state, formAction, isPending] = harness.hook;
      expect(typeof state).toBe("object");
      expect(typeof formAction).toBe("function");
      expect(typeof isPending).toBe("boolean");
    } finally {
      harness.unmount();
    }
  });

  it("forwards the configured HTTP method to apiClient", async () => {
    const spy = vi
      .spyOn(apiClient, "request")
      .mockResolvedValueOnce(jsonResponse({ success: "ok" }));

    // Render with PUT method.
    let captured: readonly [TestState, (fd: FormData) => void, boolean] | undefined;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container) as Root;

    function TestComponent() {
      const hook = useFormAction<TestState>("/api/test", "PUT");
      captured = hook;
      return null;
    }
    act(() => root.render(React.createElement(TestComponent)));

    await act(async () => {
      captured![1](new FormData());
      await flushPromises();
    });

    expect(spy).toHaveBeenCalledWith("/api/test", expect.objectContaining({ method: "PUT" }));

    act(() => root.unmount());
    container.remove();
  });
});
