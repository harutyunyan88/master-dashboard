import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import hy from './hy.ts'
import ru from './ru.ts'

export const LANGUAGES = [
  { code: 'ru', label: 'RU', locale: 'ru-RU' },
  { code: 'hy', label: 'ՀԱՅ', locale: 'hy-AM' },
] as const

export type Language = (typeof LANGUAGES)[number]['code']

const STORAGE_KEY = 'altegio-admin-lang'

function savedLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (LANGUAGES.some((l) => l.code === saved)) return saved as Language
  } catch {
    // storage unavailable
  }
  return 'ru'
}

/** Intl locale for dates in the current language. */
export function currentLocale(): string {
  return LANGUAGES.find((l) => l.code === i18n.language)?.locale ?? 'ru-RU'
}

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    // storage unavailable
  }
})

void i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, hy: { translation: hy } },
  lng: savedLanguage(),
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
})

export default i18n
