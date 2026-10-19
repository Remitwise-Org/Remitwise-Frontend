import { describe, it, expect } from "vitest";
import {
  getTransactionDateGroupKey,
  startOfWeek,
} from "@/lib/utils/transaction-date-groups";

describe("getTransactionDateGroupKey", () => {
  // Fixed "now": Wednesday 2026-07-22 local
  const now = new Date(2026, 6, 22, 15, 0, 0);

  it("labels same calendar day as today", () => {
    expect(getTransactionDateGroupKey(new Date(2026, 6, 22, 8, 0, 0), now)).toBe(
      "today"
    );
  });

  it("labels earlier days in the same Mon–Sun week as thisWeek", () => {
    // Monday of that week
    expect(getTransactionDateGroupKey(new Date(2026, 6, 20, 10, 0, 0), now)).toBe(
      "thisWeek"
    );
    // Tuesday
    expect(getTransactionDateGroupKey(new Date(2026, 6, 21, 10, 0, 0), now)).toBe(
      "thisWeek"
    );
  });

  it("labels before week start as earlier", () => {
    expect(getTransactionDateGroupKey(new Date(2026, 6, 19, 23, 59, 0), now)).toBe(
      "earlier"
    );
  });

  it("uses Monday as week start", () => {
    const monday = startOfWeek(now);
    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(6);
    expect(monday.getDate()).toBe(20);
    expect(monday.getDay()).toBe(1);
  });
});
