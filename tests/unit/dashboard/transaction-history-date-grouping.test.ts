import { describe, it, expect } from "vitest";
import { startOfDay, subDays } from "date-fns";
import { getGroupKey } from "@/app/dashboard/transaction-history/page";

describe("getGroupKey", () => {
  const today = new Date(2026, 0, 15);
  const todayStart = startOfDay(today);
  const yesterdayStart = startOfDay(subDays(today, 1));

  it("groups a same-day timestamp as today, regardless of time-of-day", () => {
    const laterToday = new Date(2026, 0, 15, 23, 59, 59);
    expect(getGroupKey(laterToday, todayStart, yesterdayStart)).toBe("today");
  });

  it("groups yesterday's date as yesterday", () => {
    const yesterday = new Date(2026, 0, 14, 8, 0, 0);
    expect(getGroupKey(yesterday, todayStart, yesterdayStart)).toBe("yesterday");
  });

  it("groups anything older than yesterday as earlier", () => {
    const lastWeek = new Date(2026, 0, 8);
    expect(getGroupKey(lastWeek, todayStart, yesterdayStart)).toBe("earlier");
  });

  it("groups a future date as earlier (falls through, never matches today/yesterday)", () => {
    const nextWeek = new Date(2026, 0, 22);
    expect(getGroupKey(nextWeek, todayStart, yesterdayStart)).toBe("earlier");
  });
});
