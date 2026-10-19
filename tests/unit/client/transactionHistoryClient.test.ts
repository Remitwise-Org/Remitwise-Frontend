import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/client/apiClient";
import { getTransactionHistory } from "@/lib/api/transactionHistoryClient";

vi.mock("@/lib/client/apiClient", async () => {
  const actual = await vi.importActual<typeof import("@/lib/client/apiClient")>(
    "@/lib/client/apiClient"
  );
  return { ...actual, apiClient: { getJson: vi.fn() } };
});

describe("getTransactionHistory", () => {
  beforeEach(() => {
    vi.mocked(apiClient.getJson).mockReset();
  });

  it("builds the query string from the given options", async () => {
    vi.mocked(apiClient.getJson).mockResolvedValue({ transactions: [] });

    await getTransactionHistory({ limit: 25, cursor: "abc", status: "completed" });

    expect(apiClient.getJson).toHaveBeenCalledWith(
      "/api/v1/remittance/history?limit=25&cursor=abc&status=completed"
    );
  });

  it("defaults limit to 50 and omits unset params", async () => {
    vi.mocked(apiClient.getJson).mockResolvedValue({ transactions: [] });

    await getTransactionHistory();

    expect(apiClient.getJson).toHaveBeenCalledWith("/api/v1/remittance/history?limit=50");
  });

  it("returns an empty page instead of null when the session-expiry flow already ran", async () => {
    vi.mocked(apiClient.getJson).mockResolvedValue(null);

    const result = await getTransactionHistory();

    expect(result).toEqual({ transactions: [] });
  });

  it("passes through the transactions, cursor, and userAddress from the response", async () => {
    const page = {
      transactions: [{ id: "1", hash: "h", amount: "10", currency: "USDC", recipient: "r", sender: "s", date: "d", status: "completed" as const }],
      nextCursor: "next",
      userAddress: "GABC",
    };
    vi.mocked(apiClient.getJson).mockResolvedValue(page);

    const result = await getTransactionHistory();

    expect(result).toEqual(page);
  });
});
