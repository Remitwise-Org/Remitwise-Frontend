import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LocaleSwitcher from "@/components/LocaleSwitcher";

const addBreadcrumb = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: (...args: unknown[]) => addBreadcrumb(...args),
}));

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = "locale=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    Object.defineProperty(window.navigator, "language", {
      value: "en-US",
      configurable: true,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    // jsdom doesn't implement navigation; avoid the "not implemented" noise.
    // @ts-expect-error -- test-only stub
    delete window.location;
    // @ts-expect-error -- test-only stub
    window.location = { reload: vi.fn() };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("emits a structured breadcrumb with the from/to locale on switch", async () => {
    render(<LocaleSwitcher />);

    // `t()` falls back to the raw key string when a translation is missing
    // (see lib/i18n/client.ts), which this app's en.json currently does for
    // the whole `localeSwitcher` namespace -- so the trigger's accessible
    // name and the dropdown item text are the literal key paths, not copy.
    fireEvent.click(screen.getByRole("button", { name: "localeSwitcher.label" }));
    fireEvent.click(await screen.findByText("localeSwitcher.spanish"));

    await waitFor(() => expect(addBreadcrumb).toHaveBeenCalledTimes(1));
    expect(addBreadcrumb).toHaveBeenCalledWith({
      category: "locale",
      level: "info",
      data: { from: "en", to: "es" },
    });
  });

  it("does not log the locale change as a free-form message", async () => {
    render(<LocaleSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "localeSwitcher.label" }));
    fireEvent.click(await screen.findByText("localeSwitcher.spanish"));

    await waitFor(() => expect(addBreadcrumb).toHaveBeenCalledTimes(1));
    const call = addBreadcrumb.mock.calls[0][0];
    expect(call.message).toBeUndefined();
  });
});
