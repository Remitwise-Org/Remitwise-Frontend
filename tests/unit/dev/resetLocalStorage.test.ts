import { describe, it, expect, beforeEach } from "vitest";
import {
  DEV_RESET_LOCAL_STORAGE_KEYS,
  resetLocalStorage,
} from "@/lib/dev/resetLocalStorage";

describe("resetLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("clears every app-owned localStorage key", () => {
    for (const key of DEV_RESET_LOCAL_STORAGE_KEYS) {
      localStorage.setItem(key, "some-value");
    }

    resetLocalStorage();

    for (const key of DEV_RESET_LOCAL_STORAGE_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
  });

  it("leaves keys it doesn't own untouched", () => {
    localStorage.setItem("some-other-apps-key", "keep-me");

    resetLocalStorage();

    expect(localStorage.getItem("some-other-apps-key")).toBe("keep-me");
  });

  it("does nothing when localStorage already has no matching keys", () => {
    expect(() => resetLocalStorage()).not.toThrow();
  });
});
