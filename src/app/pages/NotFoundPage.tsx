import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="page-title" className="space-y-4 py-10 text-center">
      <h1 id="page-title" className="text-3xl font-semibold">
        {t('errors.notFound.title')}
      </h1>
      <p className="mx-auto max-w-prose text-ink-soft">{t('errors.notFound.body')}</p>
      <Link
        to="/"
        className="inline-flex min-h-12 items-center rounded-full bg-ink px-6 font-semibold text-paper"
      >
        {t('actions.backToJournal')}
      </Link>
    </section>
  )
}
