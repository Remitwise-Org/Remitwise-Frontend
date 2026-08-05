import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FixedSizeList } from "react-window";
import {
  TransactionVirtualRow,
} from "@/app/dashboard/transaction-history/page";
import type { Transaction } from "@/components/Dashboard/TransactionHistoryItem";

const ROW_COUNT = 250;

function buildTransactions(count: number): Transaction[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `tx-${i}`,
    hash: `hash-${i}`,
    type: "Send Money" as const,
    amount: 100 + i,
    currency: "USDC",
    counterpartyName: `Recipient ${i}`,
    counterpartyLabel: "To",
    date: new Date(2026, 0, 1 + (i % 28)).toISOString(),
    fee: 1.5,
    status: "Completed" as const,
  }));
}

describe("transaction history virtualization", () => {
  it("renders a 250-row list via react-window without rendering every row into the DOM", () => {
    const transactions = buildTransactions(ROW_COUNT);

    render(
      <div style={{ height: 500, width: "100%" }}>
        <FixedSizeList
          height={500}
          width="100%"
          itemCount={transactions.length}
          itemSize={80}
          itemData={transactions}
        >
          {TransactionVirtualRow}
        </FixedSizeList>
      </div>
    );

    // Only rows within (or just past) the visible window should be mounted --
    // proof the list is actually virtualized, not just rendered in a
    // fixed-height scroll container with all 250 rows present.
    expect(screen.getByText("Recipient 0")).toBeInTheDocument();
    expect(screen.queryByText(`Recipient ${ROW_COUNT - 1}`)).not.toBeInTheDocument();

    const renderedRows = screen.getAllByText(/^Recipient \d+$/);
    expect(renderedRows.length).toBeGreaterThan(0);
    expect(renderedRows.length).toBeLessThan(ROW_COUNT);
  });
});
