/**
 * Derives bill urgency status and days-info label from a due date string.
 * Keeps mock data and API responses in sync with the same logic.
 *
 * Urgency tier thresholds
 * ─────────────────────────────────────────────────────────────────────────────
 * | Tier      | Condition              | Days diff    |
 * |-----------|------------------------|--------------|
 * | overdue   | Due date is in the past| diff < 0     |
 * | urgent    | Due within 0–3 days    | 0 ≤ diff ≤ 3 |
 * | upcoming  | Due in 4+ days         | diff > 3     |
 * | paid      | status === "paid"      | n/a          |
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type BillUrgency = "overdue" | "urgent" | "upcoming" | "paid";

/**
 * Static display metadata for each urgency tier.
 * Consumed by UnpaidBillsSection to render tier-group headers and colour accents
 * without hard-coding the same values in multiple components.
 */
export const URGENCY_TIER_META = {
  overdue: {
    label: "Overdue",
    /** Short description shown in the tier divider */
    description: "Requires immediate attention",
    /** Tailwind colour token for the badge dot, border accent, and heading */
    accentColor: "text-red-400",
    /** Left-border accent class on compact rows */
    borderAccent: "border-l-red-500",
    /** Subtle glow background applied behind overdue cards */
    glowClass: "shadow-[0_0_0_1px_theme(colors.red.500/40%),0_0_18px_0_theme(colors.red.500/18%)]",
    /** Badge background for the count chip */
    badgeBg: "bg-red-500/15 border-red-500/30 text-red-300",
    /** Pulse ring for overdue cards – rendered as a pseudo-overlay */
    pulseRing: true,
  },
  urgent: {
    label: "Due Soon",
    description: "Pay within the next 3 days",
    accentColor: "text-amber-400",
    borderAccent: "border-l-amber-500",
    glowClass: "shadow-[0_0_0_1px_theme(colors.amber.500/30%)]",
    badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    pulseRing: false,
  },
  upcoming: {
    label: "Upcoming",
    description: "Scheduled for later",
    accentColor: "text-sky-400",
    borderAccent: "border-l-sky-500",
    glowClass: "",
    badgeBg: "bg-sky-500/15 border-sky-500/30 text-sky-300",
    pulseRing: false,
  },
} as const satisfies Record<
  Exclude<BillUrgency, "paid">,
  {
    label: string;
    description: string;
    accentColor: string;
    borderAccent: string;
    glowClass: string;
    badgeBg: string;
    pulseRing: boolean;
  }
>;

/** Canonical sort order for urgency tiers (lowest index = highest priority). */
const TIER_ORDER: Record<Exclude<BillUrgency, "paid">, number> = {
  overdue: 0,
  urgent: 1,
  upcoming: 2,
};

/**
 * Sort an array of bills by urgency tier (overdue → urgent → upcoming).
 * Bills with the same tier are sorted by ascending dueDate so the soonest
 * deadline within a tier appears first.
 * Paid bills are left at the end of the array unchanged.
 */
export function sortBillsByUrgency<T extends { status: string; dueDate: string }>(
  bills: T[]
): T[] {
  return [...bills].sort((a, b) => {
    const tierA = TIER_ORDER[a.status as Exclude<BillUrgency, "paid">] ?? 99;
    const tierB = TIER_ORDER[b.status as Exclude<BillUrgency, "paid">] ?? 99;
    if (tierA !== tierB) return tierA - tierB;
    // Within the same tier sort by due date ascending
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

/** Returns days difference: negative = overdue, 0 = today, positive = future */
export function daysDiff(dueDateStr: string): number {
  const due = new Date(dueDateStr);
  const now = new Date();
  // Compare calendar days only
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

export function computeUrgency(dueDateStr: string): BillUrgency {
  const diff = daysDiff(dueDateStr);
  if (diff < 0) return "overdue";
  if (diff <= 3) return "urgent";
  return "upcoming";
}

export function computeDaysInfo(dueDateStr: string): string {
  const diff = daysDiff(dueDateStr);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `${diff}d left`;
}
