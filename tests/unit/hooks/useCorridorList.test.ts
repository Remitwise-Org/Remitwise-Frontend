import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/client/apiClient";
import { useCorridorList } from "@/lib/hooks/useCorridorList";

vi.mock("@/lib/client/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe("useCorridorList", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("reshapes exchange rates into corridors", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      jsonResponse({
        rates: [{ sell_asset: "USDC", buy_asset: "PHP", price: "56.2" }],
        stale: false,
      })
    );

    const { result } = renderHook(() => useCorridorList());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.corridors).toEqual([{ from: "USDC", to: "PHP", rate: 56.2 }]);
    expect(result.current.error).toBeNull();
    expect(result.current.stale).toBe(false);
  });

  it("surfaces staleness from the response", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      jsonResponse({ rates: [], stale: true })
    );

    const { result } = renderHook(() => useCorridorList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stale).toBe(true);
  });

  it("surfaces a non-OK response as an error with an empty corridor list", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(jsonResponse(null, false, 503));

    const { result } = renderHook(() => useCorridorList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.corridors).toEqual([]);
    expect(result.current.error).toBe("Request failed with status 503");
  });

  it("does nothing further when apiClient.get returns null (session-expiry flow)", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(null as unknown as Response);

    const { result } = renderHook(() => useCorridorList());
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());

    expect(result.current.loading).toBe(true);
  });
});
