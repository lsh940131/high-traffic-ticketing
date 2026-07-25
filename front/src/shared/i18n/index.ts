import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ko from './locales/ko.json';
import en from './locales/en.json';

// 언어 추가 = locales에 파일 하나 더 + resources 등록.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ko: { translation: ko }, en: { translation: en } },
    fallbackLng: 'ko',
    supportedLngs: ['ko', 'en'],
    interpolation: { escapeValue: false }, // React가 XSS 처리하므로 불필요
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
