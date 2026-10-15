import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { EntryPhoto } from '@/components/EntryPhoto'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { buttonStyles } from '@/components/buttonStyles'
import { useEntriesWithPlaces } from '@/hooks'
import { formatEntryDate } from '@/lib/format'
import type { EntryWithPlace } from '@/types'
import { ShareDialog } from './ShareDialog'

/** The "Compartir" tab: pick one of your entries and share it as an image. */
export function SharePage() {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError, error, refetch } = useEntriesWithPlaces()
  const [selected, setSelected] = useState<EntryWithPlace | null>(null)

  return (
    <section aria-labelledby="share-title" className="space-y-5">
      <header className="space-y-2">
        <h1 id="share-title" className="text-3xl font-semibold md:text-4xl">
          {t('sharePage.title')}
        </h1>
        <p className="text-sm text-ink-soft">{t('sharePage.subtitle')}</p>
      </header>

      {isPending && <LoadingState variant="list" />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          emoji="📤"
          title={t('sharePage.empty.title')}
          body={t('sharePage.empty.body')}
          action={
            <Link to="/log" className={buttonStyles('primary')}>
              {t('sharePage.empty.cta')}
            </Link>
          }
        />
      )}

      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-4 rounded-2xl border border-line bg-card p-3"
            >
              <EntryPhoto entry={entry} decorative className="size-16 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-lg font-semibold">{entry.place.name}</h2>
                <p className="truncate text-sm text-ink-soft">
                  {[
                    entry.place.neighborhood ?? entry.place.city,
                    formatEntryDate(entry.date, i18n.language),
                  ].join(' · ')}
                </p>
              </div>
              <Button
                variant="secondary"
                aria-label={t('sharePage.shareAria', {
                  place: entry.place.name,
                  date: formatEntryDate(entry.date, i18n.language),
                })}
                onClick={() => setSelected(entry)}
              >
                {t('sharePage.button')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {selected && <ShareDialog entry={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}
