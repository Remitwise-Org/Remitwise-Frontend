/**
 * Component test for WalletSection.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/react/renderWithProviders";
import { WalletSection } from "./WalletSection";

describe("WalletSection", () => {
  it("renders inside a section with the wallet id", () => {
    renderWithProviders(<WalletSection />);
    expect(document.getElementById("wallet")).toBeInTheDocument();
  });

  it("renders the network radios with testnet selected by default", () => {
    renderWithProviders(<WalletSection />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    const testnet = screen.getByRole("radio", {
      name: "settings.wallet.testnet",
    });
    expect(testnet).toBeChecked();
  });

  it("renders the Soroban RPC field and currency select", () => {
    renderWithProviders(<WalletSection />);
    expect(
      screen.getByDisplayValue("https://soroban-testnet.stellar.org"),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "USDC" }),
    ).toBeInTheDocument();
  });

  it("renders the auto-split toggle and a save button", () => {
    renderWithProviders(<WalletSection />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "settings.save_changes" }),
    ).toBeInTheDocument();
  });
});
