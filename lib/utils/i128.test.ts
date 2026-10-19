import { describe, it, expect } from "vitest";
import { fitsInI128, MAX_I128_MAJOR_UNITS, I128_MAX } from "./i128";

describe("fitsInI128", () => {
  it("accepts ordinary amounts", () => {
    expect(fitsInI128(100)).toBe(true);
    expect(fitsInI128(0.01)).toBe(true);
  });

  it("accepts the exact boundary", () => {
    expect(fitsInI128(MAX_I128_MAJOR_UNITS)).toBe(true);
  });

  it("rejects an amount that would overflow i128 once converted to minor units", () => {
    // MAX_I128_MAJOR_UNITS is ~1.7e24 -- well past JS float precision, so
    // "+1" would round away. Scale up instead to get a value the boundary
    // check can actually distinguish.
    expect(fitsInI128(MAX_I128_MAJOR_UNITS * 10)).toBe(false);
  });

  it("rejects non-finite input", () => {
    expect(fitsInI128(NaN)).toBe(false);
    expect(fitsInI128(Infinity)).toBe(false);
    expect(fitsInI128(-Infinity)).toBe(false);
  });

  it("MAX_I128_MAJOR_UNITS * 10^7 does not exceed I128_MAX", () => {
    expect(BigInt(MAX_I128_MAJOR_UNITS) * 10n ** 7n).toBeLessThanOrEqual(I128_MAX);
  });
});
