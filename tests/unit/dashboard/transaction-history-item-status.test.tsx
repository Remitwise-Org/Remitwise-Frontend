import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TransactionHistoryItem, {
  type Transaction,
} from "@/components/Dashboard/TransactionHistoryItem";

const baseTransaction: Transaction = {
  id: "tx-1",
  hash: "abc123",
  type: "Send Money",
  amount: -25,
  currency: "USDC",
  counterpartyName: "Jane Doe",
  counterpartyLabel: "To",
  date: "2026-07-01 10:00",
  fee: 0.5,
  status: "Completed",
};

describe("TransactionHistoryItem status badge", () => {
  it("renders the shared success tone for Completed", () => {
    render(<TransactionHistoryItem transaction={{ ...baseTransaction, status: "Completed" }} />);
    const badge = screen.getByText("Completed").closest("div");
    expect(badge?.className).toContain("status-success");
  });

  it("renders the shared warning tone for Pending", () => {
    render(<TransactionHistoryItem transaction={{ ...baseTransaction, status: "Pending" }} />);
    const badge = screen.getByText("Pending").closest("div");
    expect(badge?.className).toContain("status-warning");
  });

  it("renders the shared error tone for Failed, with matching icon and text color", () => {
    render(<TransactionHistoryItem transaction={{ ...baseTransaction, status: "Failed" }} />);
    const badge = screen.getByText("Failed").closest("div");
    expect(badge?.className).toContain("status-error");
    // Previously the icon/border used gray while the label text used red —
    // the shared presentation applies one consistent tone to the whole badge.
    expect(badge?.className).not.toContain("gray");
  });
});
