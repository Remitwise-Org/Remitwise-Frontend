/**
 * Shared locale resolution logic used by both server and client i18n.
 *
 * Resolution precedence (highest to lowest):
 *   1. `remitwise_locale` cookie (explicit user choice)
 *   2. Saved `UserPreference.language` from DB
 *   3. `Accept-Language` header (server) / `navigator.language` (client)
 *   4. Default `en`
 */

import { SUPPORTED_LOCALES, isValidLocale } from "./cookie";

export type ResolutionSource = "cookie" | "preference" | "header" | "navigator" | "default";

export interface ResolvedLocale {
  locale: (typeof SUPPORTED_LOCALES)[number];
  source: ResolutionSource;
}

/**
 * Parse a raw language string (e.g. "en-US,en;q=0.9" or "es-ES") into
 * the first supported two-letter locale, or null if unsupported.
 */
export function parseLanguageTag(raw: string | null | undefined): (typeof SUPPORTED_LOCALES)[number] | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim();
  if (!first) return null;
  const lang = first.split("-")[0]?.trim().toLowerCase();
  return isValidLocale(lang) ? lang : null;
}

/**
 * Resolve locale with explicit inputs for testability.
 * All inputs are nullable — only present values participate in precedence.
 */
export function resolveLocale({
  cookieLocale,
  preferenceLocale,
  headerLocale,
  navigatorLocale,
}: {
  cookieLocale?: string | null;
  preferenceLocale?: string | null;
  headerLocale?: string | null;
  navigatorLocale?: string | null;
}): ResolvedLocale {
  // 1. Cookie (explicit user choice)
  if (isValidLocale(cookieLocale)) {
    return { locale: cookieLocale, source: "cookie" };
  }

  // 2. Saved user preference
  if (isValidLocale(preferenceLocale)) {
    return { locale: preferenceLocale, source: "preference" };
  }

  // 3. Accept-Language / navigator
  const fromHeader = parseLanguageTag(headerLocale);
  if (fromHeader) {
    return { locale: fromHeader, source: "header" };
  }

  const fromNav = parseLanguageTag(navigatorLocale);
  if (fromNav) {
    return { locale: fromNav, source: "navigator" };
  }

  // 4. Default
  return { locale: "en", source: "default" };
}

/** Default resolution for when no inputs are available (e.g. SSR). */
export const DEFAULT_RESOLVED: ResolvedLocale = { locale: "en", source: "default" };
