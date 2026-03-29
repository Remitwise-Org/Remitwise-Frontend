import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Info,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type SemanticTone = "success" | "warning" | "error" | "info";

export interface SemanticStatusPresentation {
  tone: SemanticTone;
  label: string;
  emphasis: string;
  icon: LucideIcon;
  badgeClassName: string;
  panelClassName: string;
  metaClassName: string;
}

const semanticToneClasses: Record<
  SemanticTone,
  {
    badge: string;
    panel: string;
    meta: string;
  }
> = {
  success: {
    badge:
      "border-status-success-border bg-status-success-bg text-status-success-fg",
    panel:
      "border-status-success-border bg-status-success-soft text-status-success-fg",
    meta: "text-status-success-fg",
  },
  warning: {
    badge:
      "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
    panel:
      "border-status-warning-border bg-status-warning-soft text-status-warning-fg",
    meta: "text-status-warning-fg",
  },
  error: {
    badge: "border-status-error-border bg-status-error-bg text-status-error-fg",
    panel:
      "border-status-error-border bg-status-error-soft text-status-error-fg",
    meta: "text-status-error-fg",
  },
  info: {
    badge: "border-status-info-border bg-status-info-bg text-status-info-fg",
    panel: "border-status-info-border bg-status-info-soft text-status-info-fg",
    meta: "text-status-info-fg",
  },
};

export function getSemanticTonePresentation(
  tone: SemanticTone,
  config: {
    label: string;
    emphasis: string;
    icon: LucideIcon;
  }
): SemanticStatusPresentation {
  return {
    tone,
    label: config.label,
    emphasis: config.emphasis,
    icon: config.icon,
    badgeClassName: semanticToneClasses[tone].badge,
    panelClassName: semanticToneClasses[tone].panel,
    metaClassName: semanticToneClasses[tone].meta,
  };
}

export function getBillStatusPresentation(status: Bill["status"]): SemanticStatusPresentation {
  switch (status) {
    case "paid":
      return getSemanticTonePresentation("success", {
        label: "Paid",
        emphasis: "Payment received",
        icon: CheckCircle2,
      });
    case "overdue":
      return getSemanticTonePresentation("error", {
        label: "Overdue",
        emphasis: "Action needed",
        icon: AlertCircle,
      });
    case "urgent":
      return getSemanticTonePresentation("warning", {
        label: "Due soon",
        emphasis: "Pay promptly",
        icon: Clock3,
      });
    case "upcoming":
      return getSemanticTonePresentation("info", {
        label: "Scheduled",
        emphasis: "Upcoming payment",
        icon: Info,
      });
  }
}

function getDaysUntil(dateValue: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(dateValue);
  dueDate.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((dueDate.getTime() - today.getTime()) / msPerDay);
}

export function getPolicyPaymentPresentation(nextPaymentDate: string, active: boolean) {
  if (!active) {
    return getSemanticTonePresentation("info", {
      label: "Inactive",
      emphasis: "Policy paused",
      icon: Info,
    });
  }

  const daysUntil = getDaysUntil(nextPaymentDate);

  if (daysUntil < 0) {
    return getSemanticTonePresentation("error", {
      label: "Overdue",
      emphasis: `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"} overdue`,
      icon: AlertCircle,
    });
  }

  if (daysUntil <= 3) {
    return getSemanticTonePresentation("warning", {
      label: "Due soon",
      emphasis: daysUntil === 0 ? "Due today" : `Due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
      icon: Clock3,
    });
  }

  return getSemanticTonePresentation("success", {
    label: "Active",
    emphasis: "Premium on schedule",
    icon: ShieldCheck,
  });
}
