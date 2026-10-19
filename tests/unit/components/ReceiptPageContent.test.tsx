import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/hooks/useSeo", () => ({
  useSeo: vi.fn(),
}));

vi.mock("@/lib/remittance/horizon", () => ({
  isValidTxHash: (hash: string) => /^[0-9a-f]{64}$/i.test(hash),
}));

import ReceiptPageContent from "@/components/ReceiptPageContent";
import type { ReceiptData } from "@/lib/remittance/horizon";

afterEach(() => {
  cleanup();
});

const VALID_HASH = "a1b2c3d4e5f60123456789abcdefa1b2c3d4e5f60123456789abcdefa1b2c3d4";
const INVALID_HASH = "not-a-valid-hash";

const completedReceipt: ReceiptData = {
  hash: VALID_HASH,
  amount: "100.00",
  currency: "USDC",
  recipient: "GABCDEF123456789012345678901234567890123456789012345678901234567",
  sender: "G123456789012345678901234567890123456789012345678901234567890123",
  date: "2026-06-15T14:30:00Z",
  fee: "0.0000100",
  status: "completed",
};

const failedReceipt: ReceiptData = {
  ...completedReceipt,
  status: "failed",
};

describe("ReceiptPageContent", () => {
  it("shows invalid hash message when txHash is not a valid 64-char hex", () => {
    render(
      <ReceiptPageContent
        txHash={INVALID_HASH}
        receiptData={null}
        notFound={false}
      />
    );
    expect(screen.getByText("Invalid Transaction Hash")).toBeInTheDocument();
  });

  it("shows not-found message when receiptData is null and notFound is true", () => {
    render(
      <ReceiptPageContent
        txHash={VALID_HASH}
        receiptData={null}
        notFound={true}
      />
    );
    expect(screen.getByText("Transaction Not Found")).toBeInTheDocument();
  });

  it("renders completed receipt data", () => {
    render(
      <ReceiptPageContent
        txHash={VALID_HASH}
        receiptData={completedReceipt}
        notFound={false}
      />
    );

    expect(screen.getByText("Transfer Successful")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("100.00")).toBeInTheDocument();
    expect(screen.getByText("USDC")).toBeInTheDocument();

    const viewOnExplorer = screen.getByText("View on Stellar Explorer");
    expect(viewOnExplorer).toBeInTheDocument();
    expect(viewOnExplorer.closest("a")).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/public/tx/${VALID_HASH}`
    );
  });

  it("renders failed receipt status", () => {
    render(
      <ReceiptPageContent
        txHash={VALID_HASH}
        receiptData={failedReceipt}
        notFound={false}
      />
    );

    expect(screen.getByText("Transfer Failed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders share and explorer action buttons", () => {
    render(
      <ReceiptPageContent
        txHash={VALID_HASH}
        receiptData={completedReceipt}
        notFound={false}
      />
    );

    expect(screen.getByText("Share")).toBeInTheDocument();
    expect(screen.getByText("Return to Dashboard")).toBeInTheDocument();
  });

  it("includes a link back to dashboard", () => {
    render(
      <ReceiptPageContent
        txHash={VALID_HASH}
        receiptData={completedReceipt}
        notFound={false}
      />
    );

    const dashboardLink = screen.getByText("Return to Dashboard").closest("a");
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });
});
