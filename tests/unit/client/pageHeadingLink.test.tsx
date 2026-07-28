// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PageHeadingLink from "@/components/PageHeadingLink";
import {
  buildCanonicalHeadingUrl,
  PAGE_HEADING_LINK_FEEDBACK_MS,
} from "@/lib/client/pageHeadingLink";
import { ToastProvider } from "@/lib/context/ToastContext";
import type { ReactNode } from "react";

function Wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function renderWithToast(ui: ReactNode) {
  return render(ui, { wrapper: Wrapper });
}

describe("PageHeadingLink", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState({}, "", "/financial-insights?tab=latest#current");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("builds a canonical URL from origin, pathname, and heading id", () => {
    expect(
      buildCanonicalHeadingUrl(
        { origin: "https://example.com", pathname: "/dashboard/insight" },
        "dashboard-insights-page-heading",
      ),
    ).toBe("https://example.com/dashboard/insight#dashboard-insights-page-heading");
  });

  it("renders a semantic heading with an inline copy control", () => {
    renderWithToast(
      <PageHeadingLink headingId="insights-page-heading" label="Insights">
        Insights
      </PageHeadingLink>,
    );

    expect(screen.getByRole("heading", { name: "Insights" })).toHaveAttribute(
      "id",
      "insights-page-heading",
    );
    expect(
      screen.getByRole("button", { name: /copy link to insights/i }),
    ).toBeInTheDocument();
  });

  it("copies the canonical URL and resets its success state after the timeout", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    renderWithToast(
      <PageHeadingLink headingId="insights-page-heading" label="Insights">
        Insights
      </PageHeadingLink>,
    );

    const button = screen.getByRole("button", { name: /copy link to insights/i });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledWith("http://localhost:3000/financial-insights#insights-page-heading");
    expect(
      screen.getByRole("button", { name: /copied link to insights/i }),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(PAGE_HEADING_LINK_FEEDBACK_MS);
    });

    expect(
      screen.getByRole("button", { name: /copy link to insights/i }),
    ).toBeInTheDocument();
  });

  it("shows a success toast with the copied URL after a successful copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    renderWithToast(
      <PageHeadingLink headingId="insights-page-heading" label="Insights">
        Insights
      </PageHeadingLink>,
    );

    const button = screen.getByRole("button", { name: /copy link to insights/i });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText("Link copied")).toBeInTheDocument();
    expect(
      screen.getByText("http://localhost:3000/financial-insights#insights-page-heading"),
    ).toBeInTheDocument();
  });

  it("does not show a toast when the copy fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("copy failed"));
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    renderWithToast(
      <PageHeadingLink headingId="insights-page-heading" label="Insights">
        Insights
      </PageHeadingLink>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy link to insights/i }));
    });

    expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
  });

  it("falls back to execCommand when navigator.clipboard is unavailable", () => {
    const execCommand = vi.fn(() => true);
    vi.stubGlobal("navigator", {});
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    renderWithToast(
      <PageHeadingLink headingId="insights-page-heading" label="Insights">
        Insights
      </PageHeadingLink>,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy link to insights/i }));

    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("handles clipboard failures without throwing or staying stuck in the copied state", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("copy failed"));
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    renderWithToast(
      <PageHeadingLink headingId="insights-page-heading" label="Insights">
        Insights
      </PageHeadingLink>,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy link to insights/i }));

    await Promise.resolve();

    expect(writeText).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /copy link to insights/i }),
    ).toBeInTheDocument();
  });

  it("resolves the legacy '/insights' path and its heading ID to the canonical '/financial-insights' path and canonical heading ID", async () => {
    window.history.replaceState({}, "", "/insights?tab=latest#current");
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    renderWithToast(
      <PageHeadingLink headingId="insights-page-heading" label="Insights">
        Insights
      </PageHeadingLink>,
    );

    const button = screen.getByRole("button", { name: /copy link to insights/i });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledWith(
      "http://localhost:3000/financial-insights#financial-insights-page-heading"
    );
  });

  it("resolves the legacy '/financial-insight' path and its heading ID to the canonical '/financial-insights' path and canonical heading ID", async () => {
    window.history.replaceState({}, "", "/financial-insight?tab=latest#current");
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    renderWithToast(
      <PageHeadingLink headingId="financial-insight-page-heading" label="Insights">
        Insights
      </PageHeadingLink>,
    );

    const button = screen.getByRole("button", { name: /copy link to insights/i });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledWith(
      "http://localhost:3000/financial-insights#financial-insights-page-heading"
    );
  });

  it("strips trailing slashes from the pathname when copying the canonical URL", async () => {
    window.history.replaceState({}, "", "/send/?draft=1");
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    renderWithToast(
      <PageHeadingLink headingId="send-page-heading" label="Send Remittance">
        Send
      </PageHeadingLink>,
    );

    const button = screen.getByRole("button", { name: /copy link to send remittance/i });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledWith(
      "http://localhost:3000/send#send-page-heading"
    );
  });
});
