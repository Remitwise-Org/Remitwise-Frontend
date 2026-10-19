import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { daysDiff, computeUrgency, computeDaysInfo } from "./urgency";

describe("Bills Urgency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("daysDiff", () => {
    it("returns 0 for today", () => {
      vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0));
      expect(daysDiff("2024-01-15T00:00:00")).toBe(0);
      expect(daysDiff("2024-01-15T23:59:59")).toBe(0);
    });

    it("returns negative for past dates (overdue)", () => {
      vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0));
      expect(daysDiff("2024-01-14T10:00:00")).toBe(-1);
      expect(daysDiff("2024-01-01T00:00:00")).toBe(-14);
    });

    it("returns positive for future dates (upcoming)", () => {
      vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0));
      expect(daysDiff("2024-01-16T10:00:00")).toBe(1);
      expect(daysDiff("2024-01-20T00:00:00")).toBe(5);
    });

    it("handles end-of-month rollover", () => {
      vi.setSystemTime(new Date(2024, 0, 31, 12, 0, 0));
      expect(daysDiff("2024-02-01T00:00:00")).toBe(1);
    });

    it("handles leap year boundaries", () => {
      vi.setSystemTime(new Date(2024, 1, 28, 12, 0, 0));
      expect(daysDiff("2024-02-29T00:00:00")).toBe(1);
      expect(daysDiff("2024-03-01T00:00:00")).toBe(2);

      // non-leap year
      vi.setSystemTime(new Date(2023, 1, 28, 12, 0, 0));
      expect(daysDiff("2023-03-01T00:00:00")).toBe(1);
    });

    it("ignores timezone offset differences by standardizing calendar days", () => {
      vi.setSystemTime(new Date(2024, 0, 15, 23, 0, 0));
      expect(daysDiff("2024-01-15T01:00:00")).toBe(0);
      expect(daysDiff("2024-01-16T01:00:00")).toBe(1);
    });
  });

  describe("computeUrgency", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date(2024, 4, 15, 12, 0, 0));
    });

    it("returns overdue for past dates", () => {
      expect(computeUrgency("2024-05-14T00:00:00")).toBe("overdue");
      expect(computeUrgency("2024-05-01T00:00:00")).toBe("overdue");
    });

    it("returns urgent for today and next 3 days", () => {
      expect(computeUrgency("2024-05-15T00:00:00")).toBe("urgent"); // 0
      expect(computeUrgency("2024-05-16T00:00:00")).toBe("urgent"); // 1
      expect(computeUrgency("2024-05-17T00:00:00")).toBe("urgent"); // 2
      expect(computeUrgency("2024-05-18T00:00:00")).toBe("urgent"); // 3
    });

    it("returns upcoming for 4 days and beyond", () => {
      expect(computeUrgency("2024-05-19T00:00:00")).toBe("upcoming"); // 4
      expect(computeUrgency("2024-06-01T00:00:00")).toBe("upcoming"); // far future
    });

    it("asserts the urgent-upcoming boundary", () => {
      expect(computeUrgency("2024-05-18T00:00:00")).toBe("urgent");
      expect(computeUrgency("2024-05-19T00:00:00")).toBe("upcoming");
    });
  });

  describe("computeDaysInfo", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date(2024, 4, 15, 12, 0, 0));
    });

    it("formats overdue dates correctly", () => {
      expect(computeDaysInfo("2024-05-14T00:00:00")).toBe("1d overdue");
      expect(computeDaysInfo("2024-05-05T00:00:00")).toBe("10d overdue");
    });

    it("formats due today correctly", () => {
      expect(computeDaysInfo("2024-05-15T00:00:00")).toBe("Due today");
    });

    it("formats due tomorrow correctly", () => {
      expect(computeDaysInfo("2024-05-16T00:00:00")).toBe("Due tomorrow");
    });

    it("formats upcoming dates correctly", () => {
      expect(computeDaysInfo("2024-05-17T00:00:00")).toBe("2d left");
      expect(computeDaysInfo("2024-05-25T00:00:00")).toBe("10d left");
    });
  });
});
