import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPLIT_CONFIG,
  computeAllocation,
  getSplitConfig,
  type SplitConfig,
} from "@/lib/remittance/split";

const sumConfig = (c: SplitConfig) =>
  c.spending + c.savings + c.bills + c.insurance;

describe("DEFAULT_SPLIT_CONFIG", () => {
  it("sums to exactly 100", () => {
    expect(sumConfig(DEFAULT_SPLIT_CONFIG)).toBe(100);
  });

  it("matches the documented spending/savings/bills/insurance split", () => {
    expect(DEFAULT_SPLIT_CONFIG).toEqual({
      spending: 50,
      savings: 30,
      bills: 15,
      insurance: 5,
    });
  });
});

describe("getSplitConfig", () => {
  it("returns a copy of the default config", () => {
    const cfg = getSplitConfig();
    expect(cfg).toEqual(DEFAULT_SPLIT_CONFIG);
    expect(cfg).not.toBe(DEFAULT_SPLIT_CONFIG);
  });

  it("returns the default config regardless of user address", () => {
    expect(getSplitConfig("GABC...XYZ")).toEqual(DEFAULT_SPLIT_CONFIG);
  });
});

describe("computeAllocation", () => {
  it("allocates each bucket by its percentage for a clean amount", () => {
    const result = computeAllocation(1000);
    expect(result).toEqual({
      spending: 500,
      savings: 300,
      bills: 150,
      insurance: 50,
    });
  });

  it("reconciles to the input amount (no funds lost or created)", () => {
    for (const amount of [0, 1, 7, 33, 99, 100, 12345, 1_000_000]) {
      const result = computeAllocation(amount);
      const sum =
        result.spending + result.savings + result.bills + result.insurance;
      expect(sum).toBe(amount);
    }
  });

  it("absorbs rounding remainder into the spending bucket", () => {
    // 33 * 30% = 9.9 -> 10 (savings), 33 * 15% = 4.95 -> 5 (bills),
    // 33 * 5% = 1.65 -> 2 (insurance), 33 * 50% = 16.5 -> 17 (spending before fix)
    const result = computeAllocation(33);
    expect(result.savings).toBe(10);
    expect(result.bills).toBe(5);
    expect(result.insurance).toBe(2);
    // spending takes whatever keeps the total reconciled
    expect(result.spending).toBe(33 - (10 + 5 + 2));
    expect(
      result.spending + result.savings + result.bills + result.insurance
    ).toBe(33);
  });

  it("returns all-zero allocations for amount 0", () => {
    expect(computeAllocation(0)).toEqual({
      spending: 0,
      savings: 0,
      bills: 0,
      insurance: 0,
    });
  });

  it("handles a large amount and still reconciles", () => {
    const amount = 987_654_321;
    const result = computeAllocation(amount);
    expect(
      result.spending + result.savings + result.bills + result.insurance
    ).toBe(amount);
  });

  it("accepts a custom config that sums to 100", () => {
    const custom: SplitConfig = {
      spending: 40,
      savings: 40,
      bills: 10,
      insurance: 10,
    };
    const result = computeAllocation(200, custom);
    expect(result).toEqual({
      spending: 80,
      savings: 80,
      bills: 20,
      insurance: 20,
    });
  });

  it("throws when the config does not sum to 100", () => {
    const bad: SplitConfig = {
      spending: 50,
      savings: 30,
      bills: 15,
      insurance: 10, // sums to 105
    };
    expect(() => computeAllocation(100, bad)).toThrow(/sum to 100/);
  });
});
