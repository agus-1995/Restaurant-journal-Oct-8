import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enJson from './en.json'
import es from './es-AR.json'

// Typing `en` as `typeof es` makes a missing/extra translation key a compile error.
const en: typeof es = enJson

export const SUPPORTED_LANGUAGES = ['es-AR', 'en'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'es-AR'

const STORAGE_KEY = 'mi-diario:lang'

function isLanguage(value: string | null): value is Language {
  return SUPPORTED_LANGUAGES.some((language) => language === value)
}

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function persistLanguage(language: string): void {
  document.documentElement.lang = language
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Storage can be unavailable (private mode); the language just won't persist.
  }
}

void i18n.use(initReactI18next).init({
  resources: { 'es-AR': { translation: es }, en: { translation: en } },
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false }, // React already escapes
  initAsync: false, // resources are bundled, so be ready synchronously
})

document.documentElement.lang = i18n.language
i18n.on('languageChanged', persistLanguage)

export default i18n
