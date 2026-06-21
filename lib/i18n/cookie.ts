"use client";

const LOCALE_COOKIE = "remitwise_locale";
const SUPPORTED_LOCALES = ["en", "es"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function getLocaleCookie(): SupportedLocale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + LOCALE_COOKIE + "=([^;]+)"));
  if (!match) return null;
  const value = decodeURIComponent(match[2]);
  return SUPPORTED_LOCALES.includes(value as SupportedLocale)
    ? (value as SupportedLocale)
    : null;
}

export function setLocaleCookie(locale: SupportedLocale): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = encodeURIComponent(LOCALE_COOKIE) + "=" + encodeURIComponent(locale) + "; max-age=" + maxAge + "; path=/; SameSite=Lax";
}

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  if (!value) return false;
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
