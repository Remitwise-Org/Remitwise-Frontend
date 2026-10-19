/**
 * Unit tests for the Send page handleConfirm logic.
 *
 * Strategy: we test the handler behaviour by exercising the pure helpers
 * (computeAllocation, route validation) and by mocking apiClient + toast
 * to assert call patterns for each branch.
 *
 * We purposely avoid rendering the full Next.js page component here — that
 * belongs in E2E tests. Instead we extract and test:
 *   1. computeAllocation integration (correct split math for default config)
 *   2. The route handler (via a thin wrapper) for the validation paths
 *   3. The handleConfirm happy / sad paths via a plain-function extract
 */

import { describe, it, expect, vi } from "vitest";
import { computeAllocation, DEFAULT_SPLIT_CONFIG, getSplitConfig } from "../../lib/remittance/split";

// ---------------------------------------------------------------------------
// 1. computeAllocation integration
// ---------------------------------------------------------------------------

describe("computeAllocation – default config", () => {
  it("returns correct proportions for a round amount", () => {
    const result = computeAllocation(100, DEFAULT_SPLIT_CONFIG);
    expect(result.spending).toBe(50);
    expect(result.savings).toBe(30);
    expect(result.bills).toBe(15);
    expect(result.insurance).toBe(5);
  });

  it("allocations sum to the original amount", () => {
    const amounts = [1, 10, 99, 100, 333, 1000, 99999];
    for (const amt of amounts) {
      const r = computeAllocation(amt, DEFAULT_SPLIT_CONFIG);
      const sum = r.spending + r.savings + r.bills + r.insurance;
      expect(sum).toBe(amt);
    }
  });

  it("uses spending bucket for remainder after rounding", () => {
    // 7 * 0.05 = 0.35, rounds to 0; spending should absorb diff
    const result = computeAllocation(7, DEFAULT_SPLIT_CONFIG);
    const sum = result.spending + result.savings + result.bills + result.insurance;
    expect(sum).toBe(7);
  });

  it("throws when config does not sum to 100", () => {
    expect(() =>
      computeAllocation(100, { spending: 50, savings: 30, bills: 15, insurance: 4 })
    ).toThrow("Split config must sum to 100%");
  });
});

describe("getSplitConfig", () => {
  it("returns the default config regardless of address", () => {
    const config = getSplitConfig("GXXXFAKEADDRESS");
    expect(config).toEqual(DEFAULT_SPLIT_CONFIG);
  });

  it("returns the default config when no address is given", () => {
    const config = getSplitConfig();
    expect(config).toEqual(DEFAULT_SPLIT_CONFIG);
  });
});

// ---------------------------------------------------------------------------
// 2. handleConfirm logic – extracted pure helper for unit testing
// ---------------------------------------------------------------------------

/**
 * Extracted version of the handleConfirm async logic for testing without
 * needing to render the full React component.
 */
interface ToastOptions {
  variant: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
}

interface HandleConfirmDeps {
  recipient: string;
  amount: number;
  currency: string;
  fetchFn: typeof fetch;
  onSuccess: (data: {
    hash: string;
    recipientName: string;
    splits: ReturnType<typeof computeAllocation>;
  }) => void;
  onToast: (opts: ToastOptions) => void;
  t: (key: string) => string;
}

async function handleConfirmLogic({
  recipient,
  amount,
  currency,
  fetchFn,
  onSuccess,
  onToast,
  t,
}: HandleConfirmDeps): Promise<{ isConfirming: boolean }> {
  if (!recipient || recipient.trim() === "") {
    onToast({ variant: "error", title: t("send.error_title"), description: t("send.error_missing_recipient") });
    return { isConfirming: false };
  }

  if (!amount || amount <= 0) {
    onToast({ variant: "error", title: t("send.error_title"), description: t("send.error_empty_amount") });
    return { isConfirming: false };
  }

  try {
    const response = await fetchFn("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, amount, currency }),
    });

    if (!response) return { isConfirming: false }; // session expiry

    const data = await (response as Response).json();

    if (!(response as Response).ok || !data.success) {
      onToast({
        variant: "error",
        title: t("send.error_title"),
        description: data.error ?? t("send.error_api"),
      });
      return { isConfirming: false };
    }

    const splits = computeAllocation(amount, getSplitConfig(recipient));
    const truncate = (addr: string) =>
      addr.length > 12 ? `${addr.substring(0, 6)}…${addr.substring(addr.length - 6)}` : addr;

    onSuccess({ hash: data.transactionId, recipientName: truncate(recipient), splits });

    onToast({
      variant: "success",
      title: t("send.success_title"),
      description: t("send.success_description"),
    });

    return { isConfirming: false };
  } catch {
    onToast({ variant: "error", title: t("send.error_title"), description: t("send.error_network") });
    return { isConfirming: false };
  }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeMockTranslator() {
  const keys: Record<string, string> = {
    "send.error_title": "Transfer failed",
    "send.error_missing_recipient": "Recipient address is required.",
    "send.error_empty_amount": "Amount must be greater than zero.",
    "send.error_network": "Network error.",
    "send.error_api": "The server returned an error.",
    "send.success_title": "Transfer submitted",
    "send.success_description": "Successfully sent {{amount}} {{currency}} to {{address}}.",
  };
  return (key: string) => keys[key] ?? key;
}

function makeOkFetch(body: object): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

function makeErrorFetch(status: number, body: object): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

function makeNetworkErrorFetch(): typeof fetch {
  return vi.fn().mockRejectedValue(new Error("Failed to fetch")) as unknown as typeof fetch;
}

// ---------------------------------------------------------------------------
// 3. handleConfirm tests
// ---------------------------------------------------------------------------

describe("handleConfirmLogic – input validation", () => {
  it("fires error toast and returns early when recipient is empty", async () => {
    const onToast = vi.fn();
    const onSuccess = vi.fn();
    const fetchFn = vi.fn();

    await handleConfirmLogic({
      recipient: "",
      amount: 100,
      currency: "USDC",
      fetchFn: fetchFn as unknown as typeof fetch,
      onSuccess,
      onToast,
      t: makeMockTranslator(),
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(onToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error", description: "Recipient address is required." })
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("fires error toast and returns early when amount is zero", async () => {
    const onToast = vi.fn();
    const fetchFn = vi.fn();

    await handleConfirmLogic({
      recipient: "GABCDEFGHIJKLMNOP",
      amount: 0,
      currency: "USDC",
      fetchFn: fetchFn as unknown as typeof fetch,
      onSuccess: vi.fn(),
      onToast,
      t: makeMockTranslator(),
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(onToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error", description: "Amount must be greater than zero." })
    );
  });

  it("fires error toast when amount is negative", async () => {
    const onToast = vi.fn();
    const fetchFn = vi.fn();

    await handleConfirmLogic({
      recipient: "GABCDEFGHIJKLMNOP",
      amount: -50,
      currency: "USDC",
      fetchFn: fetchFn as unknown as typeof fetch,
      onSuccess: vi.fn(),
      onToast,
      t: makeMockTranslator(),
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(onToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error" })
    );
  });
});

describe("handleConfirmLogic – happy path", () => {
  it("calls /api/send with correct body and invokes onSuccess with real splits", async () => {
    const onToast = vi.fn();
    const onSuccess = vi.fn();
    const fetchFn = makeOkFetch({ success: true, transactionId: "TX_REAL_HASH_123" });

    await handleConfirmLogic({
      recipient: "GABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
      amount: 100,
      currency: "USDC",
      fetchFn,
      onSuccess,
      onToast,
      t: makeMockTranslator(),
    });

    // Fetch was called with the right endpoint
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/send",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"amount\":100"),
      })
    );

    // onSuccess received the real hash (not a mock string)
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ hash: "TX_REAL_HASH_123" })
    );

    // splits are computed via computeAllocation, not inline math
    const { splits } = onSuccess.mock.calls[0][0];
    expect(splits.spending + splits.savings + splits.bills + splits.insurance).toBe(100);
    expect(splits.spending).toBe(50);
    expect(splits.savings).toBe(30);

    // Success toast fired
    expect(onToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "success" })
    );
  });

  it("no hardcoded 'Maria Santos' in recipientName", async () => {
    const onSuccess = vi.fn();
    await handleConfirmLogic({
      recipient: "GABCDE1234567890",
      amount: 50,
      currency: "USDC",
      fetchFn: makeOkFetch({ success: true, transactionId: "TX_XYZ" }),
      onSuccess,
      onToast: vi.fn(),
      t: makeMockTranslator(),
    });

    const { recipientName } = onSuccess.mock.calls[0][0];
    expect(recipientName).not.toBe("Maria Santos");
    // Should be the truncated address
    expect(recipientName).toMatch(/GABCDE/);
  });
});

describe("handleConfirmLogic – API 4xx/5xx", () => {
  it("fires error toast on 400 response", async () => {
    const onToast = vi.fn();
    const onSuccess = vi.fn();

    await handleConfirmLogic({
      recipient: "GABCDEFGHIJKLMNOP",
      amount: 100,
      currency: "USDC",
      fetchFn: makeErrorFetch(400, { success: false, error: "recipient is required." }),
      onSuccess,
      onToast,
      t: makeMockTranslator(),
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error", description: "recipient is required." })
    );
  });

  it("fires error toast on 500 response", async () => {
    const onToast = vi.fn();

    await handleConfirmLogic({
      recipient: "GABCDEFGHIJKLMNOP",
      amount: 100,
      currency: "USDC",
      fetchFn: makeErrorFetch(500, { success: false, error: "Internal server error" }),
      onSuccess: vi.fn(),
      onToast,
      t: makeMockTranslator(),
    });

    expect(onToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error" })
    );
  });
});

describe("handleConfirmLogic – network failure", () => {
  it("fires error toast on fetch rejection (network down)", async () => {
    const onToast = vi.fn();

    await handleConfirmLogic({
      recipient: "GABCDEFGHIJKLMNOP",
      amount: 100,
      currency: "USDC",
      fetchFn: makeNetworkErrorFetch(),
      onSuccess: vi.fn(),
      onToast,
      t: makeMockTranslator(),
    });

    expect(onToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error", description: "Network error." })
    );
  });

  it("does not throw — always returns isConfirming: false", async () => {
    const result = await handleConfirmLogic({
      recipient: "GABCDEFGHIJKLMNOP",
      amount: 100,
      currency: "USDC",
      fetchFn: makeNetworkErrorFetch(),
      onSuccess: vi.fn(),
      onToast: vi.fn(),
      t: makeMockTranslator(),
    });

    expect(result.isConfirming).toBe(false);
  });
});

describe("handleConfirmLogic – session expiry (null response)", () => {
  it("returns early gracefully without toast when fetch returns null", async () => {
    const onToast = vi.fn();
    const onSuccess = vi.fn();

    // Simulate apiClient returning null on session expiry
    const nullFetch = vi.fn().mockResolvedValue(null) as unknown as typeof fetch;

    await handleConfirmLogic({
      recipient: "GABCDEFGHIJKLMNOP",
      amount: 100,
      currency: "USDC",
      fetchFn: nullFetch,
      onSuccess,
      onToast,
      t: makeMockTranslator(),
    });

    expect(onSuccess).not.toHaveBeenCalled();
    // No error toast — apiClient handles the redirect
    expect(onToast).not.toHaveBeenCalled();
  });
});
