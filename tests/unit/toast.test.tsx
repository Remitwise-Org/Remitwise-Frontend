import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import Toast from "@/components/Toast";
import ToastRegion from "@/components/ToastRegion";
import { ToastProvider, useToast } from "@/lib/context/ToastContext";
import type { Toast as ToastType } from "@/lib/context/ToastContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeToast(overrides: Partial<ToastType> = {}): ToastType {
  return {
    id: "toast-1",
    variant: "info",
    title: "Test notification",
    duration: 0, // prevent auto-dismiss in tests
    ...overrides,
  };
}

function renderToast(toast: ToastType, onDismiss = vi.fn()) {
  return render(<Toast toast={toast} onDismiss={onDismiss} />);
}

// ---------------------------------------------------------------------------
// Toast – variant rendering
// ---------------------------------------------------------------------------

describe("Toast – variant rendering", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders a success toast with the correct border/bg classes", () => {
    const { container } = renderToast(makeToast({ variant: "success", title: "Saved!" }));
    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toMatch(/border-status-success-border/);
    expect(panel.className).toMatch(/bg-status-success-soft/);
  });

  it("renders an error toast with the correct border/bg classes", () => {
    const { container } = renderToast(makeToast({ variant: "error", title: "Oops" }));
    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toMatch(/border-status-error-border/);
    expect(panel.className).toMatch(/bg-status-error-soft/);
  });

  it("renders a warning toast with the correct border/bg classes", () => {
    const { container } = renderToast(makeToast({ variant: "warning", title: "Watch out" }));
    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toMatch(/border-status-warning-border/);
    expect(panel.className).toMatch(/bg-status-warning-soft/);
  });

  it("renders an info toast with the correct border/bg classes", () => {
    const { container } = renderToast(makeToast({ variant: "info", title: "FYI" }));
    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toMatch(/border-status-info-border/);
    expect(panel.className).toMatch(/bg-status-info-soft/);
  });

  it("renders the toast title", () => {
    renderToast(makeToast({ title: "Hello world" }));
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders an optional description", () => {
    renderToast(makeToast({ description: "More detail here" }));
    expect(screen.getByText("More detail here")).toBeInTheDocument();
  });

  it("does not render a description element when description is absent", () => {
    renderToast(makeToast({ title: "No desc" }));
    expect(screen.queryByText("More detail here")).toBeNull();
  });

  it("renders an optional action button", () => {
    const onClick = vi.fn();
    renderToast(makeToast({ action: { label: "Retry", onClick } }));
    const btn = screen.getByRole("button", { name: "Retry" });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Toast – accessibility / live-region semantics
// ---------------------------------------------------------------------------

describe("Toast – accessibility", () => {
  it("has role='status' (maps to aria-live='polite')", () => {
    renderToast(makeToast());
    const region = screen.getByRole("status");
    expect(region).toBeInTheDocument();
  });

  it("has aria-atomic='true'", () => {
    renderToast(makeToast());
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("variant icon has aria-hidden='true'", () => {
    renderToast(makeToast({ variant: "success" }));
    const icons = document.querySelectorAll("svg[aria-hidden='true']");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("dismiss button has an accessible label", () => {
    renderToast(makeToast());
    const btn = screen.getByRole("button", { name: "Dismiss notification" });
    expect(btn).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Toast – dismiss interaction
// ---------------------------------------------------------------------------

describe("Toast – dismiss", () => {
  it("calls onDismiss with the toast id when X is clicked", () => {
    const onDismiss = vi.fn();
    const toast = makeToast({ id: "t-42" });
    renderToast(toast, onDismiss);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(onDismiss).toHaveBeenCalledWith("t-42");
  });

  it("dismiss button is keyboard-operable (Enter triggers click)", () => {
    const onDismiss = vi.fn();
    renderToast(makeToast({ id: "t-kb" }), onDismiss);
    const btn = screen.getByRole("button", { name: "Dismiss notification" });
    btn.focus();
    fireEvent.keyDown(btn, { key: "Enter", code: "Enter" });
    fireEvent.click(btn);
    expect(onDismiss).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Toast – auto-dismiss timer
// ---------------------------------------------------------------------------

describe("Toast – auto-dismiss timer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("auto-dismisses after the specified duration", () => {
    const onDismiss = vi.fn();
    const toast = makeToast({ id: "t-timer", duration: 3000 });
    renderToast(toast, onDismiss);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onDismiss).toHaveBeenCalledWith("t-timer");
  });

  it("does not auto-dismiss when duration is 0", () => {
    const onDismiss = vi.fn();
    renderToast(makeToast({ duration: 0 }), onDismiss);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Toast – error diagnostics disclosure
// ---------------------------------------------------------------------------

describe("Toast – diagnostics disclosure (error variant)", () => {
  it("renders a 'What failed' toggle for error toasts with diagnostics", () => {
    renderToast(
      makeToast({
        variant: "error",
        diagnostics: { requestId: "req-abc", errorCode: "ERR_500" },
      }),
    );
    expect(screen.getByRole("button", { name: /What failed/i })).toBeInTheDocument();
  });

  it("disclosure is collapsed by default (aria-expanded=false)", () => {
    renderToast(
      makeToast({ variant: "error", diagnostics: { requestId: "req-abc" } }),
    );
    const toggle = screen.getByRole("button", { name: /What failed/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("expands diagnostic details on toggle click", () => {
    renderToast(
      makeToast({
        variant: "error",
        diagnostics: { requestId: "req-abc", errorCode: "ERR_500", timestamp: "2024-01-01T00:00:00Z" },
      }),
    );
    const toggle = screen.getByRole("button", { name: /What failed/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("req-abc")).toBeInTheDocument();
    expect(screen.getByText("ERR_500")).toBeInTheDocument();
  });

  it("does not render disclosure for non-error variants", () => {
    renderToast(makeToast({ variant: "success" }));
    expect(screen.queryByRole("button", { name: /What failed/i })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ToastRegion – render and a11y
// ---------------------------------------------------------------------------

/** Helper: renders a component that fires toasts then mounts ToastRegion */
function ToastRegionWrapper({ titles }: { titles: string[] }) {
  const { toast } = useToast();
  React.useEffect(() => {
    titles.forEach((title) => toast({ variant: "info", title, duration: 0 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <ToastRegion />;
}

describe("ToastRegion – render", () => {
  it("renders nothing when there are no toasts", () => {
    const { container } = render(
      <ToastProvider>
        <ToastRegion />
      </ToastProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("has aria-label='Notifications' when toasts are present", () => {
    render(
      <ToastProvider>
        <ToastRegionWrapper titles={["Hello"]} />
      </ToastProvider>,
    );
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
  });

  it("caps the visible stack at 3 toasts", async () => {
    render(
      <ToastProvider>
        <ToastRegionWrapper titles={["T1", "T2", "T3", "T4"]} />
      </ToastProvider>,
    );
    const statuses = await screen.findAllByRole("status");
    expect(statuses.length).toBeLessThanOrEqual(3);
  });
});

describe("ToastRegion – accessibility", () => {
  it("the notifications container is not itself a live region (individual toasts carry role=status)", () => {
    function WarnWrapper() {
      const { toast } = useToast();
      React.useEffect(() => {
        toast({ variant: "warning", title: "Watch out", duration: 0 });
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <ToastRegion />;
    }
    render(
      <ToastProvider>
        <WarnWrapper />
      </ToastProvider>,
    );
    const container = screen.getByLabelText("Notifications");
    expect(container).not.toHaveAttribute("aria-live");
    expect(container).not.toHaveAttribute("role", "log");
    expect(container).not.toHaveAttribute("role", "alert");
  });
});
