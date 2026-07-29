import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/client/logout", () => ({
  logout: vi.fn(),
}));

async function openMenu() {
  const { default: MobileNav } = await import("./MobileNav");
  render(<MobileNav />);
  fireEvent.click(screen.getByRole("button", { name: /open mobile menu/i }));
}

describe("MobileNav pending-translations badge (dev only)", () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    (process.env as any).NODE_ENV = ORIGINAL_NODE_ENV;
  });

  it("shows the pending-translation count in development when keys are missing", async () => {
    (process.env as any).NODE_ENV = "development";
    vi.doMock("@/lib/i18n/pending-translations", () => ({
      getPendingTranslationKeys: () => ["errors.network", "dashboard.title"],
    }));

    await openMenu();

    expect(screen.getByText("2 translations pending for es")).toBeInTheDocument();
  });

  it("shows singular phrasing for exactly one pending key", async () => {
    (process.env as any).NODE_ENV = "development";
    vi.doMock("@/lib/i18n/pending-translations", () => ({
      getPendingTranslationKeys: () => ["errors.network"],
    }));

    await openMenu();

    expect(screen.getByText("1 translation pending for es")).toBeInTheDocument();
  });

  it("renders nothing when there are no pending translations", async () => {
    (process.env as any).NODE_ENV = "development";
    vi.doMock("@/lib/i18n/pending-translations", () => ({
      getPendingTranslationKeys: () => [],
    }));

    await openMenu();

    expect(screen.queryByText(/pending for es/)).not.toBeInTheDocument();
  });

  it("never renders outside development, even with pending keys", async () => {
    (process.env as any).NODE_ENV = "production";
    vi.doMock("@/lib/i18n/pending-translations", () => ({
      getPendingTranslationKeys: () => ["errors.network"],
    }));

    await openMenu();

    expect(screen.queryByText(/pending for es/)).not.toBeInTheDocument();
  });
});
