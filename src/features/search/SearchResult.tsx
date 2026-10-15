import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PriceBadge, ReactionBadge } from '@/components/EntryBadges'
import { EntryPhoto } from '@/components/EntryPhoto'
import { formatEntryDate } from '@/lib/format'
import type { EntryWithPlace } from '@/types'

/** Compact row: a thumbnail plus just enough to recognise the meal. */
export function SearchResult({ entry }: { entry: EntryWithPlace }) {
  const { i18n } = useTranslation()
  const subtitle = [
    entry.place.neighborhood ?? entry.place.city,
    entry.dishes
      .slice(0, 2)
      .map((dish) => dish.name)
      .join(', '),
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <Link
      to={`/entry/${entry.id}`}
      className="flex items-center gap-4 rounded-2xl border border-line bg-card p-3 hover:border-ink-soft"
    >
      <EntryPhoto entry={entry} decorative className="size-20 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-lg font-semibold">{entry.place.name}</h2>
        <p className="truncate text-sm text-ink-soft">{subtitle}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm">
          <ReactionBadge reaction={entry.reaction} showLabel={false} />
          {entry.priceTier && <PriceBadge tier={entry.priceTier} />}
          {entry.isUnusual && (
            <span>
              <span aria-hidden="true">✨</span>
            </span>
          )}
          <span className="ml-auto text-ink-soft">
            {formatEntryDate(entry.date, i18n.language)}
          </span>
        </p>
      </div>
    </Link>
  )
}
