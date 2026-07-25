/**
 * Locale cookie helpers for RemitWise i18n.
 *
 * The `remitwise_locale` cookie is intentionally NOT HttpOnly so both
 * server (NextRequest.cookies) and client (document.cookie) can read it.
 * It carries a non-sensitive UI preference (language choice) and is
 * validated against supported locales on every read.
 */

export const COOKIE_NAME = "remitwise_locale";
export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

export function isValidLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

/** Set the locale cookie on the client (browser-only). */
export function setLocaleCookie(locale: SupportedLocale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Read the locale cookie on the client (browser-only). */
export function getLocaleCookieClient(): SupportedLocale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
  );
  const value = match?.[1];
  return isValidLocale(value) ? value : null;
}
