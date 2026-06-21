import i18next from 'i18next';
import en from './locales/en.json';
import es from './locales/es.json';

const SUPPORTED_LOCALES = ['en', 'es'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  if (!value) return false;
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function parseAcceptLanguage(header: string | null): SupportedLocale {
  if (!header) return 'en';
  const parsed = header.split(',')[0].split('-')[0].trim().toLowerCase();
  return isSupportedLocale(parsed) ? parsed : 'en';
}

function parseLocaleCookie(cookieHeader: string | null): SupportedLocale | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)remitwise_locale=([^;]+)/);
  if (!match) return null;
  const value = decodeURIComponent(match[1].trim());
  return isSupportedLocale(value) ? value : null;
}

function resolveLocale(
  cookieHeader: string | null,
  acceptLanguageHeader: string | null
): SupportedLocale {
  const cookieLocale = parseLocaleCookie(cookieHeader);
  if (cookieLocale) return cookieLocale;
  return parseAcceptLanguage(acceptLanguageHeader);
}

const i18nInstance = i18next.createInstance();

i18nInstance.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  interpolation: {
    escapeValue: false,
  },
});

export function getTranslator(
  cookieHeader: string | null,
  acceptLanguageHeader: string | null
) {
  const lng = resolveLocale(cookieHeader, acceptLanguageHeader);
  return i18nInstance.getFixedT(lng);
}

export { isSupportedLocale };
