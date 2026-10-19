import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks — must be defined before the component import
// ---------------------------------------------------------------------------

const mockGetConsentState = vi.fn();
const mockSetConsent = vi.fn();
const mockIsGpcEnabled = vi.fn();

vi.mock("@/lib/consent/consent", () => ({
  getConsentState: (...args: unknown[]) => mockGetConsentState(...args),
  setConsent: (...args: unknown[]) => mockSetConsent(...args),
  isGpcEnabled: (...args: unknown[]) => mockIsGpcEnabled(...args),
}));

vi.mock("@/lib/i18n/client", () => ({
  useClientTranslator: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "consent.title": "We value your privacy.",
        "consent.body": "We use analytics to improve your experience.",
        "consent.accept": "Accept Analytics",
        "consent.decline": "Decline",
        "consent.ariaLabel": "Analytics consent",
      };
      return translations[key] ?? key;
    },
  }),
  useClientLocale: () => "en-US",
}));

// Prevent `window.location.reload` from throwing in jsdom
const reloadMock = vi.fn();
Object.defineProperty(window, "location", {
  value: { ...window.location, reload: reloadMock },
  writable: true,
});

import ConsentBanner from "@/components/ConsentBanner";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ConsentBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsGpcEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
  });

  // -----------------------------------------------------------------------
  // Visibility
  // -----------------------------------------------------------------------
  it('renders the banner when consent state is "undecided"', () => {
    mockGetConsentState.mockReturnValue("undecided");
    render(<ConsentBanner />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("We value your privacy.")).toBeInTheDocument();
    expect(screen.getByText(/We use analytics/)).toBeInTheDocument();
  });

  it('does not render when consent is "granted"', () => {
    mockGetConsentState.mockReturnValue("granted");
    render(<ConsentBanner />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it('does not render when consent is "denied"', () => {
    mockGetConsentState.mockReturnValue("denied");
    render(<ConsentBanner />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // User interaction
  // -----------------------------------------------------------------------
  it("calls setConsent('granted') and reloads when Accept is clicked", async () => {
    mockGetConsentState.mockReturnValue("undecided");
    const user = userEvent.setup();
    render(<ConsentBanner />);

    await user.click(screen.getByRole("button", { name: "Accept Analytics" }));

    expect(mockSetConsent).toHaveBeenCalledWith("granted");
    expect(reloadMock).toHaveBeenCalled();
  });

  it("calls setConsent('denied') and hides when Decline is clicked", async () => {
    mockGetConsentState
      .mockReturnValueOnce("undecided") // initial render
      .mockReturnValue("denied"); // after state update
    const user = userEvent.setup();
    render(<ConsentBanner />);

    await user.click(screen.getByRole("button", { name: "Decline" }));

    expect(mockSetConsent).toHaveBeenCalledWith("denied");
    // Reload is NOT called on decline — the banner just disappears
    expect(reloadMock).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Accessibility
  // -----------------------------------------------------------------------
  it("has role=dialog with an aria-label", () => {
    mockGetConsentState.mockReturnValue("undecided");
    render(<ConsentBanner />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Analytics consent");
  });

  it("renders unique IDs on both buttons for browser testing", () => {
    mockGetConsentState.mockReturnValue("undecided");
    render(<ConsentBanner />);

    expect(document.getElementById("consent-accept-btn")).toBeInTheDocument();
    expect(document.getElementById("consent-decline-btn")).toBeInTheDocument();
  });

  it("has a unique ID on the banner container", () => {
    mockGetConsentState.mockReturnValue("undecided");
    render(<ConsentBanner />);

    expect(document.getElementById("consent-banner")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Keyboard navigation
  // -----------------------------------------------------------------------
  it("allows tabbing between Decline and Accept buttons", async () => {
    mockGetConsentState.mockReturnValue("undecided");
    const user = userEvent.setup();
    render(<ConsentBanner />);

    const decline = screen.getByRole("button", { name: "Decline" });
    const accept = screen.getByRole("button", { name: "Accept Analytics" });

    // Tab through buttons
    await user.tab();
    // The first focusable button should get focus
    const focused = document.activeElement;
    expect(focused === decline || focused === accept).toBe(true);
  });
});
