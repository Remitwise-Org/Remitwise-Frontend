import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getToastTimeoutMs } from "@/lib/config/toast";

describe("getToastTimeoutMs", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 5000 as a sane default when the env var is not set", () => {
    delete process.env.NEXT_PUBLIC_TOAST_TIMEOUT;
    expect(getToastTimeoutMs()).toBe(5000);
  });

  it("returns the parsed env var when it is a valid positive integer", () => {
    process.env.NEXT_PUBLIC_TOAST_TIMEOUT = "3000";
    expect(getToastTimeoutMs()).toBe(3000);
  });

  it("returns the parsed env var when it is zero", () => {
    process.env.NEXT_PUBLIC_TOAST_TIMEOUT = "0";
    expect(getToastTimeoutMs()).toBe(0);
  });

  it("explicit failure mode: falls back to 5000 when env var is non-numeric", () => {
    process.env.NEXT_PUBLIC_TOAST_TIMEOUT = "not-a-number";
    expect(getToastTimeoutMs()).toBe(5000);
  });

  it("explicit failure mode: falls back to 5000 when env var is negative", () => {
    process.env.NEXT_PUBLIC_TOAST_TIMEOUT = "-1000";
    expect(getToastTimeoutMs()).toBe(5000);
  });
});
