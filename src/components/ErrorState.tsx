import { useTranslation } from 'react-i18next'
import { errorMessageKey } from '@/lib/errors'
import { Button } from './Button'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="rounded-3xl border border-line bg-card p-8 text-center">
      <p className="text-4xl" aria-hidden="true">
        🍳
      </p>
      <h2 className="mt-3 font-display text-2xl font-semibold">{t('state.errorTitle')}</h2>
      <p className="mx-auto mt-2 max-w-prose text-ink-soft">{t(errorMessageKey(error))}</p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          {t('actions.tryAgain')}
        </Button>
      )}
    </div>
  )
}
