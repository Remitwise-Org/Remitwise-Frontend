"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  THEME_STORAGE_KEY,
  ThemePreference,
  isThemePreference,
} from "@/lib/config/theme";

interface ThemeContextType {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemePreference(theme: ThemePreference) {
  const root = document.documentElement;
  const updateClass = (isDark: boolean) => {
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", theme === "light");
  };

  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    return;
  }

  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
    return;
  }

  root.classList.remove("light");
  const mediaQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
  const prefersDark = mediaQuery?.matches ?? false;
  updateClass(prefersDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") {
      return "system";
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedTheme) ? storedTheme : "system";
  });

  useEffect(() => {
    try {
      applyThemePreference(theme);

      if (theme === "system" && typeof window.matchMedia === "function") {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const listener = (event: MediaQueryListEvent) => {
          applyThemePreference(theme);
        };

        if (typeof mediaQuery.addEventListener === "function") {
          mediaQuery.addEventListener("change", listener);
        } else {
          mediaQuery.addListener(listener);
        }

        return () => {
          if (typeof mediaQuery.removeEventListener === "function") {
            mediaQuery.removeEventListener("change", listener);
          } else {
            mediaQuery.removeListener(listener);
          }
        };
      }
    } catch {
      // Ignore DOM or localStorage failures silently.
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemePreference) => {
    setThemeState(newTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore localStorage write failures.
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error(
      "useTheme must be used within a ThemeProvider. Did you forget to wrap your component in <ThemeProvider>?"
    );
  }
  return context;
}
