import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Info,
  ShieldCheck,
} from "lucide-react";

import {
  getBillStatusPresentation,
  getPolicyPaymentPresentation,
  getSemanticTonePresentation,
  type SemanticStatusPresentation,
  type SemanticTone,
} from "@/lib/ui/status-semantics";

function expectStablePresentationShape(
  presentation: SemanticStatusPresentation,
  expected: Pick<SemanticStatusPresentation, "tone" | "label" | "emphasis" | "icon">
) {
  expect(presentation).toMatchObject(expected);
  expect(presentation.badgeClassName).toEqual(expect.any(String));
  expect(presentation.panelClassName).toEqual(expect.any(String));
  expect(presentation.metaClassName).toEqual(expect.any(String));
  expect(presentation.badgeClassName).toContain(`status-${expected.tone}`);
  expect(presentation.panelClassName).toContain(`status-${expected.tone}`);
  expect(presentation.metaClassName).toContain(`status-${expected.tone}`);
}

describe("status-semantics presentation engine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getSemanticTonePresentation", () => {
    const toneCases: Array<{
      tone: SemanticTone;
      label: string;
      emphasis: string;
      icon: typeof Info;
    }> = [
      {
        tone: "success",
        label: "Ready",
        emphasis: "All clear",
        icon: CheckCircle2,
      },
      {
        tone: "warning",
        label: "Review",
        emphasis: "Needs attention",
        icon: Clock3,
      },
      {
        tone: "error",
        label: "Blocked",
        emphasis: "Action needed",
        icon: AlertCircle,
      },
      {
        tone: "info",
        label: "Scheduled",
        emphasis: "Upcoming item",
        icon: Info,
      },
    ];

    it.each(toneCases)(
      "returns a stable presentation shape for $tone",
      ({ tone, label, emphasis, icon }) => {
        expectStablePresentationShape(
          getSemanticTonePresentation(tone, { label, emphasis, icon }),
          { tone, label, emphasis, icon }
        );
      }
    );
  });

  describe("getBillStatusPresentation", () => {
    it.each([
      ["overdue", "error", "Overdue", "Action needed", AlertCircle],
      ["urgent", "warning", "Due soon", "Pay promptly", Clock3],
      ["upcoming", "info", "Scheduled", "Upcoming payment", Info],
      ["paid", "success", "Paid", "Payment received", CheckCircle2],
    ] as const)(
      "maps %s bills to the expected presentation",
      (status, tone, label, emphasis, icon) => {
        expectStablePresentationShape(getBillStatusPresentation(status), {
          tone,
          label,
          emphasis,
          icon,
        });
      }
    );
  });

  describe("getPolicyPaymentPresentation", () => {
    it("marks inactive policies as paused regardless of date", () => {
      expectStablePresentationShape(
        getPolicyPaymentPresentation("2025-12-01T00:00:00", false),
        {
          tone: "info",
          label: "Inactive",
          emphasis: "Policy paused",
          icon: Info,
        }
      );
    });

    it("marks a past due date as overdue", () => {
      expectStablePresentationShape(
        getPolicyPaymentPresentation("2026-01-13T00:00:00", true),
        {
          tone: "error",
          label: "Overdue",
          emphasis: "2 days overdue",
          icon: AlertCircle,
        }
      );
    });

    it("marks today's due date as due today", () => {
      expectStablePresentationShape(
        getPolicyPaymentPresentation("2026-01-15T23:59:59", true),
        {
          tone: "warning",
          label: "Due soon",
          emphasis: "Due today",
          icon: Clock3,
        }
      );
    });

    it.each([
      ["2026-01-16T00:00:00", "Due in 1 day"],
      ["2026-01-18T00:00:00", "Due in 3 days"],
    ])("marks %s as due soon", (dateValue, emphasis) => {
      expectStablePresentationShape(
        getPolicyPaymentPresentation(dateValue, true),
        {
          tone: "warning",
          label: "Due soon",
          emphasis,
          icon: Clock3,
        }
      );
    });

    it("marks dates beyond the due-soon window as active", () => {
      expectStablePresentationShape(
        getPolicyPaymentPresentation("2026-01-19T00:00:00", true),
        {
          tone: "success",
          label: "Active",
          emphasis: "Premium on schedule",
          icon: ShieldCheck,
        }
      );
    });
  });
});
