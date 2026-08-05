import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/client/apiClient";
import {
  OUTBOX_DLQ_URL,
  OUTBOX_PROCESS_URL,
  replayEventUrl,
  useOutboxRetry,
} from "@/lib/hooks/useOutboxRetry";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SAMPLE_LIST = {
  success: true,
  data: {
    events: [
      {
        id: "evt-1",
        source: "anchor",
        eventType: "deposit.completed",
        status: "dlq",
        retryCount: 3,
        maxRetries: 3,
        lastError: "timeout",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    pagination: { limit: 50, offset: 0, total: 1, hasMore: false },
    stats: { pending: 0, processing: 0, processed: 5, failed: 1, dlq: 1, total: 6 },
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useOutboxRetry", () => {
  it("loads events and stats from the DLQ endpoint", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue(jsonResponse(SAMPLE_LIST));

    const { result } = renderHook(() => useOutboxRetry());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(get).toHaveBeenCalledWith(OUTBOX_DLQ_URL);
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe("evt-1");
    expect(result.current.stats?.dlq).toBe(1);
  });

  it("retryOne() posts to the per-event replay URL and refreshes on success", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue(jsonResponse(SAMPLE_LIST));
    const post = vi.spyOn(apiClient, "post").mockResolvedValue(jsonResponse({ success: true }));

    const { result } = renderHook(() => useOutboxRetry());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.retryOne("evt-1");
    });

    expect(post).toHaveBeenCalledWith(replayEventUrl("evt-1"));
    expect(ok).toBe(true);
    // one initial load + one refresh after successful retry
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });

  it("retryOne() does not refresh and returns false on failure", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(jsonResponse(SAMPLE_LIST));
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue(jsonResponse({ error: "Event not found or not in DLQ" }, 404));

    const { result } = renderHook(() => useOutboxRetry());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.retryOne("missing");
    });

    expect(post).toHaveBeenCalledWith(replayEventUrl("missing"));
    expect(ok).toBe(false);
  });

  it("retryAll() posts to the bulk process URL", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(jsonResponse(SAMPLE_LIST));
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue(jsonResponse({ success: true, data: { processed: 3, failed: 0 } }));

    const { result } = renderHook(() => useOutboxRetry());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.retryAll();
    });

    expect(post).toHaveBeenCalledWith(OUTBOX_PROCESS_URL);
    expect(ok).toBe(true);
  });
});
