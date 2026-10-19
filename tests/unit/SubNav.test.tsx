import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SubNav from "@/components/Nav/SubNav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from "next/navigation";

describe("SubNav", () => {
  it("renders all dashboard sub-nav links", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    render(<SubNav />);

    expect(screen.getByRole("link", { name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Savings Goals/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Insights/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /History/ })).toBeInTheDocument();
  });

  it("marks the exact-match root route (/dashboard) as active with aria-current=page", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    render(<SubNav />);

    expect(screen.getByRole("link", { name: /Overview/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks a nested sub-route (/dashboard/goals) as active with aria-current=page", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard/goals");
    render(<SubNav />);

    expect(screen.getByRole("link", { name: /Savings Goals/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("does not mark the root Overview link active for a nested sub-route", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard/goals");
    render(<SubNav />);

    expect(
      screen.getByRole("link", { name: /Overview/ }),
    ).not.toHaveAttribute("aria-current");
  });

  it("does not mark any link active for an unrelated route", () => {
    vi.mocked(usePathname).mockReturnValue("/send");
    render(<SubNav />);

    for (const name of [/Overview/, /Savings Goals/, /Insights/, /History/]) {
      expect(screen.getByRole("link", { name })).not.toHaveAttribute(
        "aria-current",
      );
    }
  });

  it("keeps a deeper nested route (/dashboard/goals/123) active on its parent sub-nav link", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard/goals/123");
    render(<SubNav />);

    expect(screen.getByRole("link", { name: /Savings Goals/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
