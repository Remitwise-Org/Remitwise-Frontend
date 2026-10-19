/**
 * Unit tests for the Notice component — variant rendering and semantics.
 *
 * Covers:
 *   - Each variant (info / warning / error / success) renders with the correct
 *     ARIA role, design-token classes, and icon
 *   - Title and children content
 *   - Dismiss button: presence, accessibility label, and callback
 *   - Action slot: presence and callback
 *   - aria-atomic attribute
 *   - Edge cases: rich children, very long strings, minimal props
 *
 * Closes #1143
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Notice, {
  NOTICE_VARIANTS,
  type NoticeVariant,
} from "@/components/Notice";

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderNotice(
  variant: NoticeVariant,
  overrides: Partial<React.ComponentProps<typeof Notice>> = {},
) {
  const { children, ...rest } = overrides;
  return render(
    <Notice variant={variant} {...rest}>
      {children ?? "Body text"}
    </Notice>,
  );
}

// ---------------------------------------------------------------------------
// Variant — ARIA roles
// ---------------------------------------------------------------------------

describe("Notice — ARIA roles per variant", () => {
  it.each([
    ["error", "alert"],
    ["warning", "alert"],
  ] as [NoticeVariant, string][])(
    "%s variant renders role=%s (assertive live region)",
    (variant, expectedRole) => {
      const { container } = renderNotice(variant);
      expect(
        container.querySelector(`[role="${expectedRole}"]`),
      ).toBeInTheDocument();
    },
  );

  it.each([
    ["info", "status"],
    ["success", "status"],
  ] as [NoticeVariant, string][])(
    "%s variant renders role=%s (polite live region)",
    (variant, expectedRole) => {
      const { container } = renderNotice(variant);
      expect(
        container.querySelector(`[role="${expectedRole}"]`),
      ).toBeInTheDocument();
    },
  );

  it("every variant includes aria-atomic='true' on the wrapper", () => {
    for (const variant of NOTICE_VARIANTS) {
      const { container } = renderNotice(variant);
      expect(container.firstChild).toHaveAttribute("aria-atomic", "true");
      cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// Variant — design-token CSS classes
// ---------------------------------------------------------------------------

describe("Notice — design-token classes per variant", () => {
  it.each([
    [
      "info" as NoticeVariant,
      "border-status-info-border",
      "bg-status-info-soft",
    ],
    [
      "warning" as NoticeVariant,
      "border-status-warning-border",
      "bg-status-warning-soft",
    ],
    [
      "error" as NoticeVariant,
      "border-status-error-border",
      "bg-status-error-soft",
    ],
    [
      "success" as NoticeVariant,
      "border-status-success-border",
      "bg-status-success-soft",
    ],
  ])(
    "%s variant has correct border and background token classes",
    (variant, borderClass, bgClass) => {
      const { container } = renderNotice(variant);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass(borderClass);
      expect(wrapper).toHaveClass(bgClass);
    },
  );

  it("applies extra className to the wrapper when provided", () => {
    const { container } = renderNotice("info", { className: "mt-4 w-full" });
    expect(container.firstChild).toHaveClass("mt-4", "w-full");
  });
});

// ---------------------------------------------------------------------------
// Variant — icon
// ---------------------------------------------------------------------------

describe("Notice — status icon", () => {
  it("status icon has aria-hidden='true' so screen-readers ignore it", () => {
    const { container } = renderNotice("info");
    const svgs = container.querySelectorAll("svg");
    // First SVG is always the status icon
    expect(svgs[0]).toHaveAttribute("aria-hidden", "true");
  });
});

// ---------------------------------------------------------------------------
// Content: title and children
// ---------------------------------------------------------------------------

describe("Notice — title and children", () => {
  it("renders children body content", () => {
    renderNotice("info", { children: "Wallet is in read-only mode." });
    expect(
      screen.getByText("Wallet is in read-only mode."),
    ).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    renderNotice("warning", { title: "Rates changed" });
    expect(screen.getByText("Rates changed")).toBeInTheDocument();
  });

  it("does_not_render_title_element_when_title_is_omitted", () => {
    renderNotice("info");
    expect(screen.queryByText("Rates changed")).not.toBeInTheDocument();
  });

  it("renders rich React-node children (links inside body)", () => {
    render(
      <Notice variant="info">
        See <a href="/docs">documentation</a> for details.
      </Notice>,
    );
    expect(
      screen.getByRole("link", { name: "documentation" }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Dismiss button
// ---------------------------------------------------------------------------

describe("Notice — dismiss button", () => {
  it("renders dismiss button when onDismiss is provided", () => {
    renderNotice("error", { onDismiss: vi.fn() });
    expect(
      screen.getByRole("button", { name: "Dismiss" }),
    ).toBeInTheDocument();
  });

  it("does_not_render_dismiss_button_when_onDismiss_is_omitted", () => {
    renderNotice("success");
    expect(
      screen.queryByRole("button", { name: "Dismiss" }),
    ).not.toBeInTheDocument();
  });

  it("calls_onDismiss_exactly_once_when_dismiss_button_is_clicked", () => {
    const onDismiss = vi.fn();
    renderNotice("warning", { onDismiss });
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismiss button has aria-label='Dismiss'", () => {
    renderNotice("info", { onDismiss: vi.fn() });
    expect(
      screen.getByRole("button", { name: "Dismiss" }),
    ).toHaveAttribute("aria-label", "Dismiss");
  });

  it("dismiss button is a native <button> and not disabled (keyboard-operable)", () => {
    renderNotice("error", { onDismiss: vi.fn() });
    const btn = screen.getByRole("button", { name: "Dismiss" });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).not.toHaveAttribute("disabled");
  });

  it("dismiss button has focus-visible ring class", () => {
    renderNotice("success", { onDismiss: vi.fn() });
    const btn = screen.getByRole("button", { name: "Dismiss" });
    expect(btn).toHaveClass("focus-visible:ring-2");
  });

  it("dismiss icon svg has aria-hidden='true'", () => {
    renderNotice("warning", { onDismiss: vi.fn() });
    const btn = screen.getByRole("button", { name: "Dismiss" });
    const svg = btn.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});

// ---------------------------------------------------------------------------
// Action slot
// ---------------------------------------------------------------------------

describe("Notice — action slot", () => {
  it("renders action button when action prop is provided", () => {
    renderNotice("info", {
      action: { label: "View details", onClick: vi.fn() },
    });
    expect(
      screen.getByRole("button", { name: "View details" }),
    ).toBeInTheDocument();
  });

  it("does_not_render_action_button_when_action_is_omitted", () => {
    renderNotice("info");
    expect(
      screen.queryByRole("button", { name: "View details" }),
    ).not.toBeInTheDocument();
  });

  it("calls_action_onClick_exactly_once_when_action_button_is_clicked", () => {
    const onClick = vi.fn();
    renderNotice("error", { action: { label: "Retry", onClick } });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("action button has focus-visible ring class", () => {
    renderNotice("warning", {
      action: { label: "Retry", onClick: vi.fn() },
    });
    expect(
      screen.getByRole("button", { name: "Retry" }),
    ).toHaveClass("focus-visible:ring-2");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Notice — edge cases", () => {
  it("renders_without_throwing_when_only_required_props_are_given", () => {
    expect(() =>
      render(<Notice variant="info">Minimal notice</Notice>),
    ).not.toThrow();
  });

  it("handles_very_long_body_text_without_throwing", () => {
    const longBody = "word ".repeat(200).trim();
    render(<Notice variant="warning">{longBody}</Notice>);
    expect(screen.getByText(longBody)).toBeInTheDocument();
  });

  it("handles_very_long_title_without_throwing", () => {
    const longTitle = "A".repeat(300);
    renderNotice("error", { title: longTitle });
    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it("renders_all_four_variants_without_throwing", () => {
    for (const variant of NOTICE_VARIANTS) {
      expect(() =>
        render(<Notice variant={variant}>Content for {variant}</Notice>),
      ).not.toThrow();
      cleanup();
    }
  });
});
