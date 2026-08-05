import { describe, it, expect } from "vitest";
import { isValidIban } from "@/lib/validation/iban";

describe("isValidIban", () => {
  it("accepts well-known valid IBANs, with or without spacing", () => {
    expect(isValidIban("GB29 NWBK 6016 1331 9268 19")).toBe(true);
    expect(isValidIban("GB29NWBK60161331926819")).toBe(true);
    expect(isValidIban("DE89370400440532013000")).toBe(true);
    expect(isValidIban("FR1420041010050500013M02606")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isValidIban("gb29 nwbk 6016 1331 9268 19")).toBe(true);
  });

  it("treats an empty or whitespace-only value as valid (field is optional)", () => {
    expect(isValidIban("")).toBe(true);
    expect(isValidIban("   ")).toBe(true);
  });

  it("rejects an IBAN with a bad checksum", () => {
    expect(isValidIban("GB29 NWBK 6016 1331 9268 18")).toBe(false);
  });

  it("rejects a structurally invalid value", () => {
    expect(isValidIban("not an iban")).toBe(false);
    expect(isValidIban("1234567890")).toBe(false);
  });

  it("rejects a value that's too short to be a real IBAN", () => {
    expect(isValidIban("GB29NW")).toBe(false);
  });
});
