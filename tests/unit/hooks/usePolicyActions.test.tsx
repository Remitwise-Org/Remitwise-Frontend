import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePolicyActions, type PolicyActionState } from "@/lib/hooks/usePolicyActions";
import { apiClient } from "@/lib/client/apiClient";
import { AsyncOperationsProvider } from "@/lib/context/AsyncOperationsContext";

// Mock apiClient
vi.mock("@/lib/client/apiClient", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <AsyncOperationsProvider>{children}</AsyncOperationsProvider>;
}

describe("usePolicyActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("payPremium", () => {
    it("should start in idle state", () => {
      const { result } = renderHook(() => usePolicyActions(), { wrapper });
      expect(result.current.payState.status).toBe("idle");
    });

    it("should transition to pending then success on valid response", async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ xdr: "test-xdr-123" }),
      });

      const { result } = renderHook(() => usePolicyActions(), { wrapper });

      act(() => {
        result.current.payPremium("policy-1");
      });

      expect(result.current.payState.status).toBe("pending");

      await waitFor(() => expect(result.current.payState.status).toBe("success"));
      expect((result.current.payState as Extract<PolicyActionState, { status: "success" }>).xdr).toBe("test-xdr-123");
    });

    it("should handle 401 unauthorized", async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      const { result } = renderHook(() => usePolicyActions(), { wrapper });

      await act(async () => {
        await result.current.payPremium("policy-1");
      });

      expect(result.current.payState.status).toBe("error");
      expect((result.current.payState as Extract<PolicyActionState, { status: "error" }>).message).toContain("Unauthorized");
    });

    it("should handle missing xdr in response", async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => usePolicyActions(), { wrapper });

      await act(async () => {
        await result.current.payPremium("policy-1");
      });

      expect(result.current.payState.status).toBe("error");
      expect((result.current.payState as Extract<PolicyActionState, { status: "error" }>).message).toContain("missing transaction payload");
    });

    it("should handle network errors", async () => {
      (apiClient.post as Mock).mockRejectedValueOnce(new Error("Network failure"));

      const { result } = renderHook(() => usePolicyActions(), { wrapper });

      await act(async () => {
        await result.current.payPremium("policy-1");
      });

      expect(result.current.payState.status).toBe("error");
      expect((result.current.payState as Extract<PolicyActionState, { status: "error" }>).message).toBe("Network failure");
    });

    it("should reject empty policyId", async () => {
      const { result } = renderHook(() => usePolicyActions(), { wrapper });

      await act(async () => {
        await result.current.payPremium("");
      });

      expect(result.current.payState.status).toBe("error");
    });

    it("should deduplicate concurrent requests", async () => {
      let resolve: (value: unknown) => void;
      const promise = new Promise((r) => { resolve = r; });
      (apiClient.post as Mock).mockReturnValueOnce(promise);

      const { result } = renderHook(() => usePolicyActions(), { wrapper });

      act(() => {
        result.current.payPremium("policy-1");
      });
      act(() => {
        result.current.payPremium("policy-1");
      });

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      resolve!({ ok: true, json: async () => ({ xdr: "xdr" }) });
    });

    it("should reset to idle", async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ xdr: "xdr" }),
      });

      const { result } = renderHook(() => usePolicyActions(), { wrapper });

      await act(async () => {
        await result.current.payPremium("policy-1");
      });
      expect(result.current.payState.status).toBe("success");

      act(() => {
        result.current.resetPay();
      });
      expect(result.current.payState.status).toBe("idle");
    });
  });

  describe("deactivate", () => {
    it("should transition to success on valid response", async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ xdr: "deactivate-xdr" }),
      });

      const { result } = renderHook(() => usePolicyActions(), { wrapper });

      await act(async () => {
        await result.current.deactivate("policy-1");
      });

      expect(result.current.deactivateState.status).toBe("success");
    });

    it("should handle 403 forbidden (owner-only)", async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "Forbidden: only owner can deactivate" }),
      });

      const { result } = renderHook(() => usePolicyActions(), { wrapper });

      await act(async () => {
        await result.current.deactivate("policy-1");
      });

      expect(result.current.deactivateState.status).toBe("error");
      expect((result.current.deactivateState as Extract<PolicyActionState, { status: "error" }>).message).toContain("Forbidden");
    });
  });

  describe("independent state", () => {
    it("should keep pay and deactivate states independent", async () => {
      (apiClient.post as Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ xdr: "pay-xdr" }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ xdr: "deactivate-xdr" }) });

      const { result } = renderHook(() => usePolicyActions(), { wrapper });

      await act(async () => {
        await result.current.payPremium("policy-1");
      });
      expect(result.current.payState.status).toBe("success");
      expect(result.current.deactivateState.status).toBe("idle");

      await act(async () => {
        await result.current.deactivate("policy-1");
      });
      expect(result.current.deactivateState.status).toBe("success");
      expect(result.current.payState.status).toBe("success");
    });
  });
});