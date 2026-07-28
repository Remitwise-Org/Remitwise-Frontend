import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TransactionHistoryItem } from "../../../components/TransactionHistoryItem";
import React from "react";

describe("TransactionHistoryItem External Links", () => {
  it("should have rel='noopener noreferrer' on external explorer links", () => {
    const mockTransaction = {
      id: "12345",
      type: "Payment",
      amount: "100",
      status: "completed",
      date: "2026-07-28",
      counterpartyLabel: "To",
      counterpartyName: "Alice",
      hash: "abc123hash",
      fee: 0.1,
      currency: "USDC"
    };

    render(<TransactionHistoryItem transaction={mockTransaction} />);
    
    // There could be multiple links, let's check all anchor tags with target="_blank"
    const links = screen.getAllByRole("link");
    const externalLinks = links.filter((link) => link.getAttribute("target") === "_blank");
    
    expect(externalLinks.length).toBeGreaterThan(0);
    
    externalLinks.forEach((link) => {
      const rel = link.getAttribute("rel");
      expect(rel).toContain("noopener");
      expect(rel).toContain("noreferrer");
    });
  });
});
