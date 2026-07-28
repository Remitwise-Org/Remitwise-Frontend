import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  BUILD_SHA,
  getFeatureFlags,
  getDefaultWalletChain,
  getDiagnosticsSnapshot,
} from "@/lib/config/diagnostics";
import DebugDiagnosticsPage from "@/app/debug/page";

// Mock next/navigation
const mockNotFound = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  notFound: () => mockNotFound(),
}));

// Mock stellar-wallet-kit
vi.mock("stellar-wallet-kit", () => ({
  useWallet: () => ({
    isConnected: false,
    network: null,
  }),
}));

describe("lib/config/diagnostics", () => {
  it("provides build SHA string", () => {
    expect(typeof BUILD_SHA).toBe("string");
    expect(BUILD_SHA.length).toBeGreaterThan(0);
  });

  it("returns default wallet chain", () => {
    const chain = getDefaultWalletChain();
    expect(typeof chain).toBe("string");
    expect(["testnet", "mainnet"]).toContain(chain.toLowerCase());
  });

  it("returns system feature flags object", () => {
    const flags = getFeatureFlags();
    expect(flags).toBeTypeOf("object");
    expect(flags).toHaveProperty("custodialMode");
    expect(flags).toHaveProperty("developerMode");
    expect(flags).toHaveProperty("recurringRemittance");
    expect(flags).toHaveProperty("emergencyTransfer");
    expect(flags).toHaveProperty("familyWallet");
  });

  it("creates a complete diagnostics snapshot", () => {
    const snapshot = getDiagnosticsSnapshot({
      activeNetwork: "mainnet",
      lastRequestId: "test-req-999",
    });
    expect(snapshot.buildSha).toBe(BUILD_SHA);
    expect(snapshot.walletChain).toBe("mainnet");
    expect(snapshot.lastRequestId).toBe("test-req-999");
    expect(snapshot.featureFlags).toBeDefined();
  });
});

describe("app/debug/page (Diagnostics Page)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockSearchParams = new URLSearchParams();
  });

  it("triggers notFound() when ?debug=1 is absent or invalid", () => {
    mockSearchParams = new URLSearchParams("");
    render(<DebugDiagnosticsPage />);
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("renders diagnostics details when ?debug=1 is present", () => {
    mockSearchParams = new URLSearchParams("debug=1");
    sessionStorage.setItem("dev-latest-request-id", "req-abc-123");

    render(<DebugDiagnosticsPage />);

    expect(screen.getByText("/debug Diagnostics")).toBeInTheDocument();
    expect(document.getElementById("diagnostics-build-sha")?.textContent).toBe(BUILD_SHA);
    expect(document.getElementById("diagnostics-last-request-id")?.textContent).toBe("req-abc-123");
    expect(document.getElementById("diagnostics-wallet-chain")).not.toBeNull();
    expect(document.getElementById("diagnostics-feature-flags")).not.toBeNull();
  });

  it("updates last request-id when dev-request-id-updated event fires", () => {
    mockSearchParams = new URLSearchParams("debug=1");
    render(<DebugDiagnosticsPage />);

    expect(document.getElementById("diagnostics-last-request-id")?.textContent).toBe("None");

    act(() => {
      window.dispatchEvent(
        new CustomEvent("dev-request-id-updated", { detail: "req-event-789" })
      );
    });

    expect(document.getElementById("diagnostics-last-request-id")?.textContent).toBe("req-event-789");
  });

  it("copies raw JSON when copy button is clicked", async () => {
    mockSearchParams = new URLSearchParams("debug=1");
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      configurable: true,
    });

    render(<DebugDiagnosticsPage />);

    const copyBtn = document.getElementById("diagnostics-copy-json-btn");
    expect(copyBtn).not.toBeNull();

    await act(async () => {
      fireEvent.click(copyBtn!);
    });

    expect(writeTextSpy).toHaveBeenCalled();
    const jsonPayload = JSON.parse(writeTextSpy.mock.calls[0][0]);
    expect(jsonPayload).toHaveProperty("buildSha");
    expect(jsonPayload).toHaveProperty("featureFlags");
    expect(jsonPayload).toHaveProperty("walletChain");
    expect(jsonPayload).toHaveProperty("lastRequestId");
  });
});
