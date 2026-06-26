// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SendHeader from "@/app/send/components/SendHeader";

const backMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: backMock,
  }),
}));

describe("SendHeader deep links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/send?draft=1#review");
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("copies the canonical URL from the fixed page title control", () => {
    render(<SendHeader />);

    fireEvent.click(screen.getByRole("button", { name: /copy link to send remittance/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "http://localhost:3000/send#send-page-heading",
    );
  });
});
