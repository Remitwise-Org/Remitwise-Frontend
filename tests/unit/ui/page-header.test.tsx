// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PageHeader from "@/components/PageHeader";

const backMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: backMock,
  }),
}));

describe("PageHeader deep links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/bills?filter=all#old");
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders a copy button for the primary page heading and copies the canonical URL", async () => {
    render(
      <PageHeader
        title="Bill Payments"
        subtitle="Manage and track your recurring bills"
        ctaLabel="Add Bill"
        headingId="bills-page-heading"
      />,
    );

    expect(screen.getByRole("heading", { name: "Bill Payments" })).toHaveAttribute(
      "id",
      "bills-page-heading",
    );

    fireEvent.click(screen.getByRole("button", { name: /copy link to bill payments/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "http://localhost:3000/bills#bills-page-heading",
    );
  });
});
