import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/client/apiClient";
import { HEALTH_DEEP_URL, useHealthDeep } from "@/lib/hooks/useHealthDeep";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useHealthDeep", () => {
  it("fetches the deep health endpoint and exposes the parsed body", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue(
      jsonResponse({
        status: "ok",
        database: { reachable: true },
        rpc: { reachable: true, latestLedger: 42 },
        anchor: { reachable: true },
        timestamp: "2026-01-01T00:00:00.000Z",
      }),
    );

    const { result } = renderHook(() => useHealthDeep());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(get).toHaveBeenCalledWith(HEALTH_DEEP_URL);
    expect(result.current.data?.status).toBe("ok");
    expect(result.current.data?.rpc.latestLedger).toBe(42);
    expect(result.current.error).toBeNull();
  });

  it("surfaces a degraded (503) response body instead of treating it as an error", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(
      jsonResponse(
        {
          status: "degraded",
          database: { reachable: false, error: "unreachable" },
          rpc: { reachable: true },
          anchor: { reachable: true },
          timestamp: "2026-01-01T00:00:00.000Z",
        },
        503,
      ),
    );

    const { result } = renderHook(() => useHealthDeep());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.status).toBe("degraded");
    expect(result.current.data?.database.reachable).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("stops loading without setting data when apiClient returns null (session expiry)", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(null);

    const { result } = renderHook(() => useHealthDeep());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
  });

  it("refresh() re-fetches", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue(
        jsonResponse({
          status: "ok",
          database: { reachable: true },
          rpc: { reachable: true },
          anchor: { reachable: true },
          timestamp: "2026-01-01T00:00:00.000Z",
        }),
      );

    const { result } = renderHook(() => useHealthDeep());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(get).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });
});
