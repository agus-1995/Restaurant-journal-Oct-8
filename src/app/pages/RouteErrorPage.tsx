import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/** Router-level error boundary: shown when a route throws while rendering. */
export function RouteErrorPage() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-16 text-center" role="alert">
      <h1 className="text-3xl font-semibold">{t('errors.generic.title')}</h1>
      <p className="text-ink-soft">{t('errors.generic.body')}</p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-12 rounded-full bg-terracotta px-6 font-semibold text-paper"
        >
          {t('actions.tryAgain')}
        </button>
        <Link
          to="/"
          className="inline-flex min-h-12 items-center rounded-full border border-ink px-6 font-semibold text-ink"
        >
          {t('actions.backToJournal')}
        </Link>
      </div>
    </main>
  )
}
