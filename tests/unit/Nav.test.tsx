import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Nav } from "@/components/Nav";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from "next/navigation";

describe("Nav", () => {
  it("renders all navigation items", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    render(<Nav />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Send Money" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Smart Split" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Savings Goals" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bill Payments" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Insurance" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Family Wallets" })).toBeInTheDocument();
  });

  it("adds aria-current=page to the active route", () => {
    vi.mocked(usePathname).mockReturnValue("/send");
    render(<Nav />);

    const activeLink = screen.getByRole("link", { name: "Send Money" });
    expect(activeLink).toHaveAttribute("aria-current", "page");
  });

  it("does not add aria-current to inactive routes", () => {
    vi.mocked(usePathname).mockReturnValue("/send");
    render(<Nav />);

    const inactiveLink = screen.getByRole("link", { name: "Dashboard" });
    expect(inactiveLink).not.toHaveAttribute("aria-current");
  });

  it("has a nav landmark with aria-label", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    render(<Nav />);

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toBeInTheDocument();
  });
});