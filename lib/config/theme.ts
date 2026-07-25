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
