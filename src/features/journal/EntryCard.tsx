import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PriceBadge, ReactionBadge } from '@/components/EntryBadges'
import { EntryPhoto } from '@/components/EntryPhoto'
import { formatEntryDate } from '@/lib/format'
import type { EntryWithPlace } from '@/types'

/** A polaroid-style card: the photo leads, the details are secondary. */
export function EntryCard({ entry }: { entry: EntryWithPlace }) {
  const { t, i18n } = useTranslation()
  const extraPhotos = entry.photos.length - 1
  return (
    <Link
      to={`/entry/${entry.id}`}
      className="group block rounded-sm border border-line bg-card p-2 pb-3 shadow-polaroid transition-transform motion-safe:group-hover:-translate-y-1"
    >
      <div className="relative">
        <EntryPhoto entry={entry} decorative className="aspect-[4/5] w-full rounded-[2px]" />
        {entry.isUnusual && (
          <span className="absolute top-2 left-2 rounded-full bg-mustard px-2 py-0.5 text-sm font-semibold text-ink">
            <span aria-hidden="true">✨</span>
            <span className="sr-only">{t('entry.unusual')}</span>
          </span>
        )}
        {extraPhotos > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 rounded-full bg-ink/75 px-2 py-0.5 text-xs font-semibold text-paper"
          >
            +{extraPhotos}
          </span>
        )}
      </div>
      <div className="px-1 pt-2">
        <h3 className="line-clamp-2 font-display text-lg leading-snug font-semibold">
          {entry.place.name}
        </h3>
        <p className="truncate text-sm text-ink-soft">
          {entry.place.neighborhood ?? entry.place.city}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm">
          <ReactionBadge reaction={entry.reaction} showLabel={false} />
          {entry.priceTier && <PriceBadge tier={entry.priceTier} />}
          <span className="ml-auto text-ink-soft">
            {formatEntryDate(entry.date, i18n.language)}
          </span>
        </p>
      </div>
    </Link>
  )
}
