import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletSection } from "@/components/settings/WalletSection";
import { ToastProvider } from "@/lib/context/ToastContext";

function renderWalletSection() {
  return render(
    <ToastProvider>
      <WalletSection />
    </ToastProvider>
  );
}

describe("WalletSection payout IBAN validation", () => {
  it("does not show an error while the field is empty", () => {
    renderWalletSection();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a validation error for an invalid IBAN", async () => {
    const user = userEvent.setup();
    renderWalletSection();

    const ibanInputs = screen.getAllByRole("textbox");
    const ibanInput = ibanInputs[ibanInputs.length - 1];
    await user.type(ibanInput, "not an iban");

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid IBAN/i);
  });

  it("clears the error once a valid IBAN is entered", async () => {
    const user = userEvent.setup();
    renderWalletSection();

    const ibanInputs = screen.getAllByRole("textbox");
    const ibanInput = ibanInputs[ibanInputs.length - 1];
    await user.type(ibanInput, "invalid");
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.clear(ibanInput);
    await user.type(ibanInput, "DE89370400440532013000");

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
