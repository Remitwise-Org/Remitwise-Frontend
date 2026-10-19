import { describe, it, expect, afterEach, vi } from "vitest";
import { getDefaultThemePreference } from "@/lib/config/theme";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getDefaultThemePreference", () => {
  it("falls back to system when NEXT_PUBLIC_DEFAULT_THEME is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_THEME", "");
    expect(getDefaultThemePreference()).toBe("system");
  });

  it("uses the env value when it is a valid theme preference", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_THEME", "dark");
    expect(getDefaultThemePreference()).toBe("dark");
  });

  it("falls back to system when the env value is invalid", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_THEME", "midnight");
    expect(getDefaultThemePreference()).toBe("system");
  });
});
