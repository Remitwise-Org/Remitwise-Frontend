import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Keypair } from "@stellar/stellar-sdk";
import RecipientAddressInput from "@/app/send/components/RecipientAddressInput";

describe("RecipientAddressInput", () => {
  it("keeps Continue disabled and does not call onContinue for a non-Stellar address", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<RecipientAddressInput onContinue={onContinue} />);

    await user.type(
      screen.getByLabelText(/Recipient Address/),
      "0x71C7656EC7ab88b098defB751B7401B5f6d8976"
    );

    const continueButton = screen.getByRole("button", { name: "Continue to Amount" });
    expect(continueButton).toBeDisabled();

    await user.click(continueButton);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("enables Continue and calls onContinue for a valid Stellar public key", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const validAddress = Keypair.random().publicKey();
    render(<RecipientAddressInput onContinue={onContinue} />);

    await user.type(screen.getByLabelText(/Recipient Address/), validAddress);

    const continueButton = screen.getByRole("button", { name: "Continue to Amount" });
    expect(continueButton).toBeEnabled();

    await user.click(continueButton);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("keeps Continue disabled for a structurally valid but bad-checksum address", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const validAddress = Keypair.random().publicKey();
    const badChecksum = `${validAddress.slice(0, -1)}${validAddress.at(-1) === "A" ? "B" : "A"}`;
    render(<RecipientAddressInput onContinue={onContinue} />);

    await user.type(screen.getByLabelText(/Recipient Address/), badChecksum);

    expect(screen.getByRole("button", { name: "Continue to Amount" })).toBeDisabled();
    expect(screen.getByText(/Checksum failed/)).toBeInTheDocument();
  });
});
