import { useTranslation } from 'react-i18next'

interface LoadingStateProps {
  /** Shape of the skeleton, so the page doesn't jump when data arrives. */
  variant?: 'grid' | 'list' | 'detail'
}

export function LoadingState({ variant = 'grid' }: LoadingStateProps) {
  const { t } = useTranslation()
  const block = 'bg-paper-deep animate-pulse rounded-2xl'
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{t('a11y.loading')}</span>
      {variant === 'grid' && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`${block} aspect-[4/6]`} />
          ))}
        </div>
      )}
      {variant === 'list' && (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={`${block} h-24`} />
          ))}
        </div>
      )}
      {variant === 'detail' && (
        <div className="space-y-4" aria-hidden="true">
          <div className={`${block} aspect-[4/3]`} />
          <div className={`${block} h-10 w-2/3`} />
          <div className={`${block} h-24`} />
        </div>
      )}
    </div>
  )
}
