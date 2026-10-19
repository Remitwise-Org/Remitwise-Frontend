import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  daysDiff,
  computeUrgency,
  computeDaysInfo,
  sortBillsByUrgency,
  URGENCY_TIER_META,
} from "@/lib/bills/urgency";
import {
  validateDueDateNotPast,
  nextDueDateFromNow,
} from "@/lib/contracts/bill-payments";

// Fixed "now" for deterministic calendar-day math.
// 2026-06-29T12:34:56 local time.
const NOW = new Date(2026, 5, 29, 12, 34, 56);

/** Build an ISO-like date string offset by `days` calendar days from NOW. */
function dueInDays(days: number, hours = 9, minutes = 0): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("daysDiff", () => {
  it("returns 0 for a bill due today regardless of time-of-day", () => {
    expect(daysDiff(dueInDays(0, 0, 0))).toBe(0);
    expect(daysDiff(dueInDays(0, 23, 59))).toBe(0);
    expect(daysDiff(dueInDays(0, 12, 0))).toBe(0);
  });

  it("returns a negative value for an overdue (past) bill", () => {
    expect(daysDiff(dueInDays(-1))).toBe(-1);
    expect(daysDiff(dueInDays(-5))).toBe(-5);
  });

  it("returns a positive value for a future bill", () => {
    expect(daysDiff(dueInDays(1))).toBe(1);
    expect(daysDiff(dueInDays(7))).toBe(7);
    expect(daysDiff(dueInDays(30))).toBe(30);
  });

  it("normalizes time-of-day so the bucket does not depend on the hour", () => {
    // Due tomorrow at 00:01 and at 23:59 are both exactly +1 calendar day.
    expect(daysDiff(dueInDays(1, 0, 1))).toBe(1);
    expect(daysDiff(dueInDays(1, 23, 59))).toBe(1);
  });
});

describe("computeUrgency", () => {
  it("labels past-due bills as 'overdue'", () => {
    expect(computeUrgency(dueInDays(-1))).toBe("overdue");
    expect(computeUrgency(dueInDays(-10))).toBe("overdue");
  });

  it("labels bills due within 0–3 days as 'urgent'", () => {
    expect(computeUrgency(dueInDays(0))).toBe("urgent");
    expect(computeUrgency(dueInDays(1))).toBe("urgent");
    expect(computeUrgency(dueInDays(3))).toBe("urgent");
  });

  it("labels bills due in more than 3 days as 'upcoming'", () => {
    expect(computeUrgency(dueInDays(4))).toBe("upcoming");
    expect(computeUrgency(dueInDays(7))).toBe("upcoming");
    expect(computeUrgency(dueInDays(30))).toBe("upcoming");
  });

  it("treats the today/overdue boundary correctly (no off-by-one)", () => {
    // Due today late at night is still 'urgent', not 'overdue'.
    expect(computeUrgency(dueInDays(0, 23, 59))).toBe("urgent");
    // Due yesterday is 'overdue'.
    expect(computeUrgency(dueInDays(-1, 0, 1))).toBe("overdue");
  });
});

describe("computeDaysInfo", () => {
  it("describes overdue bills with the day count", () => {
    expect(computeDaysInfo(dueInDays(-1))).toBe("1d overdue");
    expect(computeDaysInfo(dueInDays(-5))).toBe("5d overdue");
  });

  it("describes today and tomorrow specially", () => {
    expect(computeDaysInfo(dueInDays(0))).toBe("Due today");
    expect(computeDaysInfo(dueInDays(1))).toBe("Due tomorrow");
  });

  it("describes future bills with days left", () => {
    expect(computeDaysInfo(dueInDays(7))).toBe("7d left");
    expect(computeDaysInfo(dueInDays(30))).toBe("30d left");
  });
});

// ─── Helper to build a minimal stub bill ─────────────────────────────────────

type StubBill = { id: string; status: string; dueDate: string };

function stub(
  id: string,
  status: "overdue" | "urgent" | "upcoming" | "paid",
  daysOffset: number
): StubBill {
  const d = new Date(NOW);
  d.setDate(d.getDate() + daysOffset);
  return { id, status, dueDate: d.toISOString() };
}

// ─── sortBillsByUrgency ───────────────────────────────────────────────────────

describe("sortBillsByUrgency", () => {
  it("orders tiers overdue → urgent → upcoming", () => {
    const bills = [
      stub("c", "upcoming", 10),
      stub("a", "overdue", -3),
      stub("b", "urgent", 1),
    ];
    const sorted = sortBillsByUrgency(bills);
    expect(sorted.map((b) => b.status)).toEqual(["overdue", "urgent", "upcoming"]);
  });

  it("sorts within the same tier by ascending dueDate", () => {
    const bills = [
      stub("later", "overdue", -1),
      stub("earlier", "overdue", -5),
    ];
    const sorted = sortBillsByUrgency(bills);
    expect(sorted[0].id).toBe("earlier");
    expect(sorted[1].id).toBe("later");
  });

  it("leaves paid bills at the end without reordering them", () => {
    const bills = [
      stub("p1", "paid", -7),
      stub("o1", "overdue", -2),
      stub("p2", "paid", -10),
    ];
    const sorted = sortBillsByUrgency(bills);
    expect(sorted[0].status).toBe("overdue");
    // Both paid bills stay after the overdue one
    expect(sorted.slice(1).every((b) => b.status === "paid")).toBe(true);
  });

  it("returns an empty array unchanged", () => {
    expect(sortBillsByUrgency([])).toEqual([]);
  });

  it("returns a single-element array unchanged", () => {
    const single = [stub("x", "upcoming", 5)];
    expect(sortBillsByUrgency(single)).toEqual(single);
  });

  it("does not mutate the original array", () => {
    const original = [stub("b", "urgent", 2), stub("a", "overdue", -1)];
    const copy = [...original];
    sortBillsByUrgency(original);
    expect(original).toEqual(copy);
  });
});

// ─── URGENCY_TIER_META shape smoke tests ─────────────────────────────────────

describe("URGENCY_TIER_META", () => {
  const tiers = ["overdue", "urgent", "upcoming"] as const;

  it("defines all three urgency tiers", () => {
    tiers.forEach((tier) => {
      expect(URGENCY_TIER_META).toHaveProperty(tier);
    });
  });

  it("every tier has required display fields", () => {
    tiers.forEach((tier) => {
      const meta = URGENCY_TIER_META[tier];
      expect(typeof meta.label).toBe("string");
      expect(typeof meta.description).toBe("string");
      expect(typeof meta.accentColor).toBe("string");
      expect(typeof meta.borderAccent).toBe("string");
      expect(typeof meta.badgeBg).toBe("string");
      expect(typeof meta.pulseRing).toBe("boolean");
    });
  });

  it("only the overdue tier has pulseRing enabled", () => {
    expect(URGENCY_TIER_META.overdue.pulseRing).toBe(true);
    expect(URGENCY_TIER_META.urgent.pulseRing).toBe(false);
    expect(URGENCY_TIER_META.upcoming.pulseRing).toBe(false);
  });
});

// ─── validateDueDateNotPast — smoke tests via urgency test suite ─────────────

describe("validateDueDateNotPast (smoke)", () => {
  it('rejects "0" with dueDate-in-past', () => {
    expect(() => validateDueDateNotPast("0")).toThrow("dueDate-in-past");
  });

  it("rejects a past date with dueDate-in-past", () => {
    const past = new Date(NOW.getTime() - 86_400_000).toISOString();
    expect(() => validateDueDateNotPast(past)).toThrow("dueDate-in-past");
  });

  it("accepts a future date without throwing", () => {
    const future = new Date(NOW.getTime() + 86_400_000).toISOString();
    expect(() => validateDueDateNotPast(future)).not.toThrow();
  });
});

// ─── nextDueDateFromNow — recurring generation never creates past dates ───────

describe("nextDueDateFromNow (smoke)", () => {
  it("always returns a date after now regardless of how stale the base is", () => {
    const staleBase = new Date(NOW.getTime() - 365 * 86_400_000).toISOString();
    const next = nextDueDateFromNow(staleBase, 30);
    expect(Date.parse(next)).toBeGreaterThan(Date.now());
  });

  it("the result always passes validateDueDateNotPast", () => {
    const pastBase = new Date(NOW.getTime() - 10 * 86_400_000).toISOString();
    const next = nextDueDateFromNow(pastBase, 7);
    expect(() => validateDueDateNotPast(next)).not.toThrow();
  });
});
