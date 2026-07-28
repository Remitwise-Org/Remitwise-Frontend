import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("NotFound page", () => {
  it("renders 404 error badge", () => {
    render(<NotFound />);
    expect(screen.getByText(/404/i)).toBeInTheDocument();
  });

  it("renders a descriptive heading", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: /lost in the transfer/i })
    ).toBeInTheDocument();
  });

  it("renders the recovery navigation landmark", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("navigation", { name: /recovery navigation/i })
    ).toBeInTheDocument();
  });

  it("renders all six primary navigation links with correct hrefs", () => {
    render(<NotFound />);

    const expectedLinks: { name: string; href: string }[] = [
      { name: "Dashboard", href: "/dashboard" },
      { name: "Send Money", href: "/send" },
      { name: "Bills", href: "/bills" },
      { name: "Insurance", href: "/insurance" },
      { name: "Family", href: "/family" },
      { name: "Settings", href: "/settings" },
    ];

    for (const { name, href } of expectedLinks) {
      const link = screen.getByText(name).closest("a");
      expect(link, `Expected "${name}" link to exist`).not.toBeNull();
      expect(link).toHaveAttribute("href", href);
    }
  });

  it("renders a 'Go to Home' link pointing to /", () => {
    render(<NotFound />);
    const homeLink = screen.getByRole("link", { name: /go to home/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("renders an 'Open Dashboard' link pointing to /dashboard", () => {
    render(<NotFound />);
    const dashLink = screen.getByRole("link", { name: /open dashboard/i });
    expect(dashLink).toHaveAttribute("href", "/dashboard");
  });

  it("all navigation links have visible descriptive text", () => {
    render(<NotFound />);
    // Each card shows a one-line description beneath the name
    expect(screen.getByText("Your financial overview")).toBeInTheDocument();
    expect(screen.getByText("Transfer funds instantly")).toBeInTheDocument();
    expect(screen.getByText("Manage bill payments")).toBeInTheDocument();
    expect(screen.getByText("Your coverage policies")).toBeInTheDocument();
    expect(screen.getByText("Family wallet hub")).toBeInTheDocument();
    expect(screen.getByText("Account preferences")).toBeInTheDocument();
  });
});