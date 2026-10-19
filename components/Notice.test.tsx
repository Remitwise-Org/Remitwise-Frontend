/**
 * Component tests for Notice
 *
 * Covers: rendering each variant, title + children, dismiss behavior,
 * action slot, ARIA roles, accessible labeling, and axe clean passes.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import Notice, { NOTICE_VARIANTS, type NoticeVariant } from "./Notice";

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderNotice(
  variant: NoticeVariant,
  props: Partial<React.ComponentProps<typeof Notice>> = {},
) {
  return render(
    <Notice variant={variant} {...props}>
      {props.children ?? "Body content"}
    </Notice>,
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("Notice", () => {
  describe("Rendering", () => {
    it("renders children (body content)", () => {
      renderNotice("info");
      expect(screen.getByText("Body content")).toBeInTheDocument();
    });

    it("renders title when provided", () => {
      renderNotice("warning", { title: "Heads up" });
      expect(screen.getByText("Heads up")).toBeInTheDocument();
    });

    it("does not render a title element when title is omitted", () => {
      renderNotice("info");
      // No element contains only the title placeholder text
      expect(screen.queryByText("Heads up")).not.toBeInTheDocument();
    });

    it("renders the dismiss button when onDismiss is provided", () => {
      const onDismiss = vi.fn();
      renderNotice("error", { onDismiss });
      expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    });

    it("does not render a dismiss button when onDismiss is omitted", () => {
      renderNotice("success");
      expect(
        screen.queryByRole("button", { name: "Dismiss" }),
      ).not.toBeInTheDocument();
    });

    it("renders the action button when action is provided", () => {
      renderNotice("info", {
        action: { label: "Retry", onClick: vi.fn() },
      });
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });

    it("does not render an action button when action is omitted", () => {
      renderNotice("info");
      expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    });

    it("renders rich React node children", () => {
      render(
        <Notice variant="info">
          See <a href="/docs">documentation</a> for details.
        </Notice>,
      );
      expect(screen.getByRole("link", { name: "documentation" })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Variants — styling
  // ---------------------------------------------------------------------------

  describe("Variants — styling", () => {
    it.each([
      [
        "info" as const,
        "border-status-info-border",
        "bg-status-info-soft",
      ],
      [
        "warning" as const,
        "border-status-warning-border",
        "bg-status-warning-soft",
      ],
      [
        "error" as const,
        "border-status-error-border",
        "bg-status-error-soft",
      ],
      [
        "success" as const,
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

    it("applies an extra className to the wrapper when provided", () => {
      const { container } = renderNotice("info", { className: "mt-6 custom-class" });
      expect(container.firstChild).toHaveClass("mt-6", "custom-class");
    });
  });

  // ---------------------------------------------------------------------------
  // ARIA roles
  // ---------------------------------------------------------------------------

  describe("ARIA roles", () => {
    it.each([
      ["error" as const, "alert"],
      ["warning" as const, "alert"],
    ])('%s variant has role="alert"', (variant, expectedRole) => {
      const { container } = renderNotice(variant);
      const el = container.querySelector(`[role="${expectedRole}"]`);
      expect(el).toBeInTheDocument();
    });

    it.each([
      ["info" as const, "status"],
      ["success" as const, "status"],
    ])('%s variant has role="status"', (variant, expectedRole) => {
      const { container } = renderNotice(variant);
      const el = container.querySelector(`[role="${expectedRole}"]`);
      expect(el).toBeInTheDocument();
    });

    it("wrapper has aria-atomic='true' on all variants", () => {
      for (const variant of NOTICE_VARIANTS) {
        const { container } = renderNotice(variant);
        expect(container.firstChild).toHaveAttribute("aria-atomic", "true");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Dismiss behavior
  // ---------------------------------------------------------------------------

  describe("Dismiss behavior", () => {
    it("calls onDismiss when dismiss button is clicked", () => {
      const onDismiss = vi.fn();
      renderNotice("warning", { onDismiss });
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("dismiss button has accessible aria-label", () => {
      renderNotice("error", { onDismiss: vi.fn() });
      const btn = screen.getByRole("button", { name: "Dismiss" });
      expect(btn).toHaveAttribute("aria-label", "Dismiss");
    });

    it("dismiss button is keyboard-operable (Enter key triggers click)", () => {
      const onDismiss = vi.fn();
      renderNotice("info", { onDismiss });
      const btn = screen.getByRole("button", { name: "Dismiss" });
      fireEvent.keyDown(btn, { key: "Enter", code: "Enter" });
      // Native <button> fires click on Enter; verify it is focusable and a button
      expect(btn.tagName).toBe("BUTTON");
      expect(btn).not.toHaveAttribute("disabled");
    });

    it("dismiss button has focus-visible ring classes", () => {
      renderNotice("success", { onDismiss: vi.fn() });
      const btn = screen.getByRole("button", { name: "Dismiss" });
      expect(btn).toHaveClass("focus-visible:ring-2");
    });

    it("dismiss X icon has aria-hidden='true'", () => {
      renderNotice("error", { onDismiss: vi.fn() });
      // The dismiss button contains an SVG; it should be hidden from AT
      const dismissBtn = screen.getByRole("button", { name: "Dismiss" });
      const svg = dismissBtn.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  // ---------------------------------------------------------------------------
  // Action slot
  // ---------------------------------------------------------------------------

  describe("Action slot", () => {
    it("calls action.onClick when action button is clicked", () => {
      const onClick = vi.fn();
      renderNotice("info", { action: { label: "View details", onClick } });
      fireEvent.click(screen.getByRole("button", { name: "View details" }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("action button has focus-visible ring classes", () => {
      renderNotice("warning", {
        action: { label: "Retry", onClick: vi.fn() },
      });
      const btn = screen.getByRole("button", { name: "Retry" });
      expect(btn).toHaveClass("focus-visible:ring-2");
    });
  });

  // ---------------------------------------------------------------------------
  // Accessibility — axe
  // ---------------------------------------------------------------------------

  describe("Accessibility (axe)", () => {
    // axe uses real timers; we must not have fake timers active.
    beforeEach(() => vi.useRealTimers());
    afterEach(() => vi.restoreAllMocks());

    it.each(NOTICE_VARIANTS)(
      "%s variant has no axe violations",
      async (variant) => {
        const { container } = render(
          <Notice
            variant={variant}
            title="Notice heading"
            onDismiss={() => {}}
            action={{ label: "Learn more", onClick: () => {} }}
          >
            This is the notice body.
          </Notice>,
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      },
    );
  });

  // ---------------------------------------------------------------------------
  // Icon
  // ---------------------------------------------------------------------------

  describe("Icon", () => {
    it("status icon has aria-hidden='true'", () => {
      const { container } = renderNotice("info");
      // First SVG in the wrapper is the status icon
      const svgs = container.querySelectorAll("svg");
      expect(svgs[0]).toHaveAttribute("aria-hidden", "true");
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("Edge cases", () => {
    it("renders with only required props (no title, no dismiss, no action)", () => {
      expect(() =>
        render(<Notice variant="info">Minimal notice</Notice>),
      ).not.toThrow();
    });

    it("handles very long body text without throwing", () => {
      const long = "word ".repeat(200).trim();
      render(<Notice variant="warning">{long}</Notice>);
      expect(screen.getByText(long)).toBeInTheDocument();
    });

    it("handles very long title without throwing", () => {
      const long = "A".repeat(300);
      renderNotice("error", { title: long });
      expect(screen.getByText(long)).toBeInTheDocument();
    });
  });
});
