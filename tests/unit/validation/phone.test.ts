import { describe, it, expect } from "vitest";
import { isValidProfilePhone } from "@/lib/validation/phone";

describe("isValidProfilePhone", () => {
  it("accepts a valid international number", () => {
    expect(isValidProfilePhone("+234 801 234 5678")).toBe(true);
    expect(isValidProfilePhone("+1 415 555 2671")).toBe(true);
  });

  it("treats an empty or whitespace-only value as valid (field is optional)", () => {
    expect(isValidProfilePhone("")).toBe(true);
    expect(isValidProfilePhone("   ")).toBe(true);
  });

  it("rejects a number missing the country code", () => {
    expect(isValidProfilePhone("801 234 5678")).toBe(false);
  });

  it("rejects garbage input", () => {
    expect(isValidProfilePhone("not a phone number")).toBe(false);
  });

  it("rejects a too-short number", () => {
    expect(isValidProfilePhone("+1 555")).toBe(false);
  });
});
