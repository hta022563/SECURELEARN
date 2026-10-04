import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationVI from './locales/vi/translation.json';
import translationEN from './locales/en/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: translationVI },
      en: { translation: translationEN },
    },
    fallbackLng: 'vi',
    supportedLngs: ['vi', 'en'],
    // Đọc ngôn ngữ từ đường dẫn URL trước tiên
    detection: {
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0, 
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
