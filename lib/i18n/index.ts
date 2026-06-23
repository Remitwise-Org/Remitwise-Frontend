import i18next from 'i18next';
import { NextRequest } from 'next/server';
import en from './locales/en.json';
import es from './locales/es.json';
import { COOKIE_NAME } from './cookie';
import { resolveLocale } from './resolve-locale';

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

export const getTranslator = (request: NextRequest) => {
  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value;
  const acceptLanguage = request.headers.get('accept-language');

  const { locale } = resolveLocale({
    cookieLocale,
    headerLocale: acceptLanguage,
  });

  return i18nInstance.getFixedT(locale);
};
