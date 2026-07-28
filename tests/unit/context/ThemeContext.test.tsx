import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/lib/context/ThemeContext";
import { ThemePreference } from "@/lib/config/theme";

type MatchMediaStub = {
  matches: boolean;
  media: string;
  onchange: null;
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
};

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string): MatchMediaStub => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe("ThemeContext", () => {
  beforeEach(() => {
    stubMatchMedia(false);
    localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
    vi.restoreAllMocks();
  });

  it("defaults to system theme when no persisted preference exists", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.theme).toBe("system");
  });

  it("restores a persisted dark theme and applies the dark class", () => {
    localStorage.setItem("theme-preference", "dark");

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("persists the selected theme preference to localStorage", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    act(() => {
      result.current.setTheme("light");
    });

    expect(result.current.theme).toBe("light");
    expect(localStorage.getItem("theme-preference")).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("adds or removes classes correctly when switching to system theme", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    act(() => {
      result.current.setTheme("dark");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      result.current.setTheme("system");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
  });

  it("throws when useTheme is used outside of ThemeProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useTheme())).toThrow(
      "useTheme must be used within a ThemeProvider. Did you forget to wrap your component in <ThemeProvider>?",
    );

    consoleSpy.mockRestore();
  });

  it("explicitly asserts CSS class changes when switching from light to dark", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    act(() => {
      result.current.setTheme("light");
    });

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    act(() => {
      result.current.setTheme("dark");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("explicitly asserts CSS class changes when switching from dark to light", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    act(() => {
      result.current.setTheme("dark");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);

    act(() => {
      result.current.setTheme("light");
    });

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("explicitly asserts CSS class changes when switching from system to dark", () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.theme).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(false);

    act(() => {
      result.current.setTheme("dark");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("explicitly asserts CSS class changes when switching from system to light", () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.theme).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);

    act(() => {
      result.current.setTheme("light");
    });

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("ensures dark and light classes are mutually exclusive", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    const themes: ThemePreference[] = ["light", "dark", "system"];

    themes.forEach((theme) => {
      act(() => {
        result.current.setTheme(theme);
      });

      const hasDark = document.documentElement.classList.contains("dark");
      const hasLight = document.documentElement.classList.contains("light");

      if (theme === "light") {
        expect(hasLight).toBe(true);
        expect(hasDark).toBe(false);
      } else if (theme === "dark") {
        expect(hasDark).toBe(true);
        expect(hasLight).toBe(false);
      } else {
        // system theme should not have light class
        expect(hasLight).toBe(false);
        // dark class depends on media query
        expect(hasDark).toBe(window.matchMedia("(prefers-color-scheme: dark)").matches);
      }
    });
  });
});
