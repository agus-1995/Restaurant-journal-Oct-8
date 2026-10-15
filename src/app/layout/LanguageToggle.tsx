import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '@/i18n'

export function LanguageToggle() {
  const { t, i18n } = useTranslation()
  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className="inline-flex rounded-full border border-line bg-card p-0.5"
    >
      {SUPPORTED_LANGUAGES.map((language) => {
        const active = i18n.language === language
        return (
          <button
            key={language}
            type="button"
            lang={language}
            aria-pressed={active}
            // The visible code ("ES") must be part of the accessible name so voice control works.
            aria-label={`${language.slice(0, 2).toUpperCase()} – ${t(`language.names.${language}`)}`}
            onClick={() => void i18n.changeLanguage(language)}
            className={`min-h-10 min-w-11 rounded-full px-3 text-sm font-semibold transition-colors ${
              active ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {language.slice(0, 2).toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
