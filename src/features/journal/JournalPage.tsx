import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { buttonStyles } from '@/components/buttonStyles'
import { useEntriesWithPlaces } from '@/hooks'
import { formatMonthYear } from '@/lib/format'
import type { EntryWithPlace } from '@/types'
import { Link } from 'react-router-dom'
import { EntryCard } from './EntryCard'

/** Groups an already newest-first list by calendar month (`YYYY-MM`), keeping order. */
function groupByMonth(
  entries: readonly EntryWithPlace[],
): { month: string; entries: EntryWithPlace[] }[] {
  const groups = new Map<string, EntryWithPlace[]>()
  for (const entry of entries) {
    const month = entry.date.slice(0, 7)
    const bucket = groups.get(month)
    if (bucket) bucket.push(entry)
    else groups.set(month, [entry])
  }
  return [...groups].map(([month, items]) => ({ month, entries: items }))
}

export function JournalPage() {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError, error, refetch } = useEntriesWithPlaces()
  const groups = useMemo(() => (data ? groupByMonth(data) : []), [data])

  return (
    <section aria-labelledby="journal-title" className="space-y-6">
      <header className="flex items-baseline justify-between gap-4">
        <h1 id="journal-title" className="text-3xl font-semibold md:text-4xl">
          {t('journal.title')}
        </h1>
        {data && data.length > 0 && (
          <p className="text-sm text-ink-soft">{t('journal.count', { count: data.length })}</p>
        )}
      </header>

      <p className="text-sm text-ink-soft">{t('journal.subtitle')}</p>

      {isPending && <LoadingState variant="grid" />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          emoji="📖"
          title={t('journal.empty.title')}
          body={t('journal.empty.body')}
          action={
            <Link to="/log" className={buttonStyles('primary')}>
              {t('journal.empty.cta')}
            </Link>
          }
        >
          <ul className="mt-5 space-y-2 text-left text-sm text-ink-soft">
            {(['tip1', 'tip2', 'tip3'] as const).map((tip) => (
              <li key={tip} className="flex gap-2">
                <span aria-hidden="true">•</span>
                {t(`journal.empty.${tip}`)}
              </li>
            ))}
          </ul>
        </EmptyState>
      )}

      {groups.map((group) => (
        <section key={group.month} aria-labelledby={`month-${group.month}`}>
          <h2
            id={`month-${group.month}`}
            className="mb-3 text-lg font-semibold text-ink-soft first-letter:uppercase"
          >
            {formatMonthYear(`${group.month}-01`, i18n.language)}
          </h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {group.entries.map((entry) => (
              <li
                key={entry.id}
                className="odd:-rotate-[0.8deg] even:rotate-[0.6deg] motion-safe:transition-transform motion-safe:hover:rotate-0"
              >
                <EntryCard entry={entry} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  )
}
