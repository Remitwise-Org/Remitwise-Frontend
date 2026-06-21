import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapPaymentToTx, isValidTxHash, fetchTransactionHistory, fetchTransactionStatus } from "@/lib/remittance/horizon";
import { getHorizonServer } from "@/lib/remittance/horizon";

vi.mock("@/lib/remittance/horizon", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/remittance/horizon")>();
  return {
    ...actual,
    getHorizonServer: vi.fn(),
  };
});

describe("Horizon Bridge Module Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isValidTxHash", () => {
    it("should return true for valid 64-hex strings", () => {
      expect(isValidTxHash("a1b2c3d4e5f60123456789abcdefa1b2c3d4e5f60123456789abcdefa1b2c3d4")).toBe(true);
      expect(isValidTxHash("A1B2C3D4E5F60123456789ABCDEFA1B2C3D4E5F60123456789ABCDEFA1B2C3D4")).toBe(true);
    });

    it("should return false for invalid lengths", () => {
      expect(isValidTxHash("a1b2c3d4e5f6")).toBe(false);
      expect(isValidTxHash("")).toBe(false);
    });

    it("should return false for non-hex characters", () => {
      expect(isValidTxHash("g1b2c3d4e5f60123456789abcdefa1b2c3d4e5f60123456789abcdefa1b2c3d4")).toBe(false);
    });
  });

  describe("mapPaymentToTx", () => {
    it("should accurately map standard native payment operations", () => {
      const mockOp = {
        id: "op123",
        amount: "150.0000000",
        asset_type: "native",
        from: "GAAA",
        to: "GBBB",
        transaction_hash: "hash123",
        created_at: "2026-06-21T00:00:00Z",
        transaction_successful: true,
      };
      
      const result = mapPaymentToTx(mockOp as any, "test memo");
      expect(result.id).toBe("op123");
      expect(result.hash).toBe("hash123");
      expect(result.amount).toBe("150.0000000");
      expect(result.currency).toBe("XLM");
      expect(result.recipient).toBe("GBBB");
      expect(result.sender).toBe("GAAA");
      expect(result.date).toBe("2026-06-21T00:00:00Z");
      expect(result.status).toBe("completed");
      expect(result.memo).toBe("test memo");
    });

    it("should accurately handle non-native assets", () => {
      const mockOp = {
        id: "op456",
        amount: "50.00",
        asset_type: "credit_alphanum4",
        asset_code: "USDC",
        from: "GAAA",
        to: "GBBB",
        transaction_hash: "hash456",
        created_at: "2026-06-21T00:00:00Z",
        transaction_successful: false,
      };

      const result = mapPaymentToTx(mockOp as any);
      expect(result.currency).toBe("USDC");
      expect(result.status).toBe("failed");
      expect(result.memo).toBeUndefined();
    });
  });

  describe("fetchTransactionStatus", () => {
    it("should throw on invalid transaction hash structure", async () => {
      await expect(fetchTransactionStatus("invalid-hash")).rejects.toThrow("Invalid transaction hash");
    });

    it("should resolve status to completed when successful evaluates to true", async () => {
      const mockServer = {
        transactions: vi.fn().mockReturnThis(),
        transaction: vi.fn().mockReturnThis(),
        call: vi.fn().mockResolvedValue({ successful: true }),
      };
      vi.mocked(getHorizonServer).mockReturnValue(mockServer as any);

      const status = await fetchTransactionStatus("a1b2c3d4e5f60123456789abcdefa1b2c3d4e5f60123456789abcdefa1b2c3d4");
      expect(status).toBe("completed");
    });

    it("should resolve status to failed when successful evaluates to false", async () => {
      const mockServer = {
        transactions: vi.fn().mockReturnThis(),
        transaction: vi.fn().mockReturnThis(),
        call: vi.fn().mockResolvedValue({ successful: false }),
      };
      vi.mocked(getHorizonServer).mockReturnValue(mockServer as any);

      const status = await fetchTransactionStatus("a1b2c3d4e5f60123456789abcdefa1b2c3d4e5f60123456789abcdefa1b2c3d4");
      expect(status).toBe("failed");
    });

    it("should return not_found on 404 response errors", async () => {
      const mockError = { response: { status: 404 } };
      const mockServer = {
        transactions: vi.fn().mockReturnThis(),
        transaction: vi.fn().mockReturnThis(),
        call: vi.fn().mockRejectedValue(mockError),
      };
      vi.mocked(getHorizonServer).mockReturnValue(mockServer as any);

      const status = await fetchTransactionStatus("a1b2c3d4e5f60123456789abcdefa1b2c3d4e5f60123456789abcdefa1b2c3d4");
      expect(status).toBe("not_found");
    });

    it("should rethrow unknown errors", async () => {
      const mockError = new Error("Network crash");
      const mockServer = {
        transactions: vi.fn().mockReturnThis(),
        transaction: vi.fn().mockReturnThis(),
        call: vi.fn().mockRejectedValue(mockError),
      };
      vi.mocked(getHorizonServer).mockReturnValue(mockServer as any);

      await expect(fetchTransactionStatus("a1b2c3d4e5f60123456789abcdefa1b2c3d4e5f60123456789abcdefa1b2c3d4")).rejects.toThrow("Network crash");
    });
  });

  describe("fetchTransactionHistory", () => {
    it("should immediately return empty structures for pending query options", async () => {
      const result = await fetchTransactionHistory("GAAA", { status: "pending" });
      expect(result.transactions).toEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });

    it("should handle options modifiers and filter matching statuses cleanly", async () => {
      const mockRecords = [
        {
          id: "op1",
          type: "payment",
          transaction_hash: "h1",
          amount: "10.0",
          asset_type: "native",
          to: "GBBB",
          from: "GAAA",
          created_at: "2026-06-21T00:00:00Z",
          transaction_successful: true,
          paging_token: "tok1",
        },
        {
          id: "op2",
          type: "payment",
          transaction_hash: "h2",
          amount: "20.0",
          asset_type: "native",
          to: "GBBB",
          from: "GAAA",
          created_at: "2026-06-21T00:00:00Z",
          transaction_successful: false,
          paging_token: "tok2",
        }
      ];

      const mockServer = {
        payments: vi.fn().mockReturnThis(),
        forAccount: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        cursor: vi.fn().mockReturnThis(),
        call: vi.fn().mockResolvedValue({ records: mockRecords }),
      };
      vi.mocked(getHorizonServer).mockReturnValue(mockServer as any);

      const result = await fetchTransactionHistory("GAAA", { limit: 5, cursor: "abc", status: "completed" });
      
      expect(mockServer.limit).toHaveBeenCalledWith(5);
      expect(mockServer.cursor).toHaveBeenCalledWith("abc");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].id).toBe("op1");
      expect(result.nextCursor).toBe("tok2");
    });

    it("should cleanly return empty items when response records array evaluates empty", async () => {
      const mockServer = {
        payments: vi.fn().mockReturnThis(),
        forAccount: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        call: vi.fn().mockResolvedValue({ records: [] }),
      };
      vi.mocked(getHorizonServer).mockReturnValue(mockServer as any);

      const result = await fetchTransactionHistory("GAAA");
      expect(result.transactions).toEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });
  });
});
