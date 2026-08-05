import { describe, it, expect } from "vitest";
import { hasAtMostDecimals } from "./decimal-places";

describe("hasAtMostDecimals", () => {
  it("accepts integers", () => {
    expect(hasAtMostDecimals(100, 2)).toBe(true);
  });

  it("accepts exactly the allowed number of decimals", () => {
    expect(hasAtMostDecimals(100.5, 2)).toBe(true);
    expect(hasAtMostDecimals(100.55, 2)).toBe(true);
  });

  it("rejects more than the allowed number of decimals", () => {
    expect(hasAtMostDecimals(100.555, 2)).toBe(false);
    expect(hasAtMostDecimals(0.001, 2)).toBe(false);
  });

  it("rejects non-finite input", () => {
    expect(hasAtMostDecimals(NaN, 2)).toBe(false);
    expect(hasAtMostDecimals(Infinity, 2)).toBe(false);
  });

  it("rejects scientific-notation values rather than mis-parsing them", () => {
    expect(hasAtMostDecimals(1e-9, 2)).toBe(false);
  });
});
