import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders } from "../../react/renderWithProviders";
import { fireEvent } from "@testing-library/react";

// Mock next/navigation
const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock stellar-wallet-kit
vi.mock("stellar-wallet-kit", () => ({
  useWallet: () => ({
    account: null,
    isConnected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    network: "testnet",
  }),
}));

// Mock logout
vi.mock("@/lib/client/logout", () => ({
  logout: vi.fn(),
}));

// Mock IntersectionObserver
const observeMock = vi.fn();
const disconnectMock = vi.fn();
global.IntersectionObserver = vi.fn().mockImplementation(function() {
  return {
    observe: observeMock,
    disconnect: disconnectMock,
    unobserve: vi.fn(),
  };
});

import SettingsNavigation from "@/components/SettingsNavigation";
import PrimaryNav from "@/components/Nav/PrimaryNav";
import SubNav from "@/components/Nav/SubNav";
import MobileNav from "@/components/Nav/MobileNav";

describe("SettingsNavigation Component", () => {
  const items = [
    { id: "profile", title: "Profile Settings", description: "Manage profile details" },
    { id: "security", title: "Security Settings", description: "Manage login credentials" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nav lists using proper semantics (nav, ul, li)", () => {
    const { container } = renderWithProviders(<SettingsNavigation items={items} />);

    // Verify outer <nav> with accessible name
    const nav = container.querySelector("nav");
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("aria-label", "Settings navigation");

    // Verify list structure (ul and li)
    const uls = container.querySelectorAll("ul");
    expect(uls.length).toBe(2); // One desktop, one mobile

    uls.forEach((ul) => {
      const lis = ul.querySelectorAll("li");
      expect(lis.length).toBe(items.length);
    });
  });

  it("applies aria-current='page' to active item and has focus-visible classes", () => {
    const { container } = renderWithProviders(<SettingsNavigation items={items} />);

    // By default, first item is active (activeId defaults to items[0].id)
    const activeLinks = container.querySelectorAll('a[aria-current="page"]');
    expect(activeLinks.length).toBe(2); // One for desktop, one for mobile

    activeLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "#profile");
      expect(link.className).toContain("focus-visible:ring-2");
    });

    const inactiveLinks = container.querySelectorAll('a:not([aria-current="page"])');
    inactiveLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "#security");
      expect(link.className).toContain("focus-visible:ring-2");
    });
  });
});

describe("PrimaryNav Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders desktop links with list semantics, aria-label, and aria-current='page'", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    const { container } = renderWithProviders(<PrimaryNav />);

    // Check nav and label
    const nav = container.querySelector('nav[aria-label="Primary navigation"]');
    expect(nav).toBeInTheDocument();

    // Check ul and li
    const ul = nav?.querySelector("ul");
    expect(ul).toBeInTheDocument();

    const lis = ul?.querySelectorAll("li");
    expect(lis?.length).toBe(6);

    // Active link assertion
    const activeLink = nav?.querySelector('a[aria-current="page"]');
    expect(activeLink).toBeInTheDocument();
    expect(activeLink).toHaveAttribute("href", "/dashboard");
    expect(activeLink?.className).toContain("focus-visible:ring-2");

    // Other links should not have aria-current
    const inactiveLink = nav?.querySelector('a[href="/send"]');
    expect(inactiveLink).toBeInTheDocument();
    expect(inactiveLink).not.toHaveAttribute("aria-current");
    expect(inactiveLink?.className).toContain("focus-visible:ring-2");
  });

  it("handles no active route cleanly", () => {
    mockUsePathname.mockReturnValue("/unknown-path");
    const { container } = renderWithProviders(<PrimaryNav />);
    const activeLink = container.querySelector('nav[aria-label="Primary navigation"] a[aria-current="page"]');
    expect(activeLink).toBeNull();
  });
});

describe("SubNav Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sub navigation list with aria-current='page' and nav/list semantics", () => {
    mockUsePathname.mockReturnValue("/dashboard/goals");
    const { container } = renderWithProviders(<SubNav />);

    const nav = container.querySelector('nav[aria-label="Dashboard sub-navigation"]');
    expect(nav).toBeInTheDocument();

    const ul = nav?.querySelector("ul");
    expect(ul).toBeInTheDocument();

    const lis = ul?.querySelectorAll("li");
    expect(lis?.length).toBe(4);

    const activeLink = nav?.querySelector('a[aria-current="page"]');
    expect(activeLink).toBeInTheDocument();
    expect(activeLink).toHaveAttribute("href", "/dashboard/goals");
    expect(activeLink?.className).toContain("focus-visible:ring-2");

    const inactiveLink = nav?.querySelector('a[href="/dashboard"]');
    expect(inactiveLink).toBeInTheDocument();
    expect(inactiveLink).not.toHaveAttribute("aria-current");
  });

  it("supports WCAG 2.1 AA keyboard arrow-key navigation (roving tabIndex)", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    const { container } = renderWithProviders(<SubNav />);

    const tabList = container.querySelector('ul[role="tablist"]');
    expect(tabList).toBeInTheDocument();

    const tabs = container.querySelectorAll('a[role="tab"]');
    expect(tabs.length).toBe(4);

    // Initial state: first tab has tabIndex="0", others "-1"
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    expect(tabs[2]).toHaveAttribute("tabindex", "-1");
    expect(tabs[3]).toHaveAttribute("tabindex", "-1");

    // Press ArrowRight
    fireEvent.keyDown(tabList!, { key: "ArrowRight" });
    expect(tabs[0]).toHaveAttribute("tabindex", "-1");
    expect(tabs[1]).toHaveAttribute("tabindex", "0");

    // Press ArrowDown
    fireEvent.keyDown(tabList!, { key: "ArrowDown" });
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    expect(tabs[2]).toHaveAttribute("tabindex", "0");

    // Press End
    fireEvent.keyDown(tabList!, { key: "End" });
    expect(tabs[2]).toHaveAttribute("tabindex", "-1");
    expect(tabs[3]).toHaveAttribute("tabindex", "0");

    // Press ArrowRight (wrap around)
    fireEvent.keyDown(tabList!, { key: "ArrowRight" });
    expect(tabs[3]).toHaveAttribute("tabindex", "-1");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");

    // Press ArrowLeft (wrap around to end)
    fireEvent.keyDown(tabList!, { key: "ArrowLeft" });
    expect(tabs[0]).toHaveAttribute("tabindex", "-1");
    expect(tabs[3]).toHaveAttribute("tabindex", "0");

    // Press Home
    fireEvent.keyDown(tabList!, { key: "Home" });
    expect(tabs[3]).toHaveAttribute("tabindex", "-1");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
  });
});

describe("MobileNav Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes aria-current='page' and uses list semantics inside open menu", async () => {
    mockUsePathname.mockReturnValue("/settings");
    const { container, getByLabelText } = renderWithProviders(<MobileNav />);

    // Find trigger button and click to open overlay
    const triggerBtn = getByLabelText("Open Mobile Menu");
    expect(triggerBtn).toBeInTheDocument();
    fireEvent.click(triggerBtn);

    // Verify outer <nav> with mobile navigation label
    const nav = container.querySelector('nav[aria-label="Mobile navigation"]');
    expect(nav).toBeInTheDocument();

    // Verify list structure (ul/li)
    const uls = nav?.querySelectorAll("ul");
    expect(uls?.length).toBeGreaterThan(0);

    const activeLink = nav?.querySelector('a[aria-current="page"]');
    expect(activeLink).toBeInTheDocument();
    expect(activeLink).toHaveAttribute("href", "/settings");
    expect(activeLink?.className).toContain("focus-visible:ring-2");
  });
});
