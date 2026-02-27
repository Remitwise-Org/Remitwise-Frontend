import i18next from 'i18next';
import en from './locales/en.json';
import es from './locales/es.json';

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

export const getTranslator = (acceptLanguageHeader: string | null) => {
  let lng = 'en';
  if (acceptLanguageHeader) {
    const parsed = acceptLanguageHeader.split(',')[0].split('-')[0].trim().toLowerCase();
    if (['en', 'es'].includes(parsed)) {
      lng = parsed;
    }
  }
  return i18nInstance.getFixedT(lng);
};
