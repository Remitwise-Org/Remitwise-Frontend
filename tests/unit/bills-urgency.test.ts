import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  daysDiff,
  computeUrgency,
  computeDaysInfo,
} from "@/lib/bills/urgency";

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
