export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "theme-preference";

export const SUPPORTED_THEME_PREFERENCES: ThemePreference[] = [
  "system",
  "light",
  "dark",
];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * The theme applied when a visitor has no `THEME_STORAGE_KEY` value yet
 * (first visit, or `localStorage` cleared). Configurable per-deployment via
 * `NEXT_PUBLIC_DEFAULT_THEME` -- e.g. an operator embedding the app in a
 * dark-only shell can set it to `"dark"` without a code change. Falls back
 * to `"system"` when unset or invalid, matching the previous hardcoded
 * behavior.
 */
export function getDefaultThemePreference(): ThemePreference {
  const envDefault = process.env.NEXT_PUBLIC_DEFAULT_THEME;
  return isThemePreference(envDefault) ? envDefault : "system";
}
