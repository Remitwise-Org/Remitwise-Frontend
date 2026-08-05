import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { ToastProvider } from "@/lib/context/ToastContext";

function renderProfileSection() {
  return render(
    <ToastProvider>
      <ProfileSection />
    </ToastProvider>
  );
}

describe("ProfileSection phone validation", () => {
  it("shows a validation error for an invalid phone number and does not clear it while still invalid", async () => {
    const user = userEvent.setup();
    renderProfileSection();

    const phoneInput = screen.getByDisplayValue("+234 801 234 5678");
    await user.clear(phoneInput);
    await user.type(phoneInput, "not a phone number");

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid phone number/i);
  });

  it("clears the error once a valid international number is entered", async () => {
    const user = userEvent.setup();
    renderProfileSection();

    const phoneInput = screen.getByDisplayValue("+234 801 234 5678");
    await user.clear(phoneInput);
    await user.type(phoneInput, "invalid");
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.clear(phoneInput);
    await user.type(phoneInput, "+1 415 555 2671");

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("does not show an error for the initial valid value", () => {
    renderProfileSection();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
