import { useTranslation } from 'react-i18next'
import type { EntryWithPlace } from '@/types'

interface EntryPhotoProps {
  entry: EntryWithPlace
  index?: number
  className?: string
  /** True when adjacent text already names the place (e.g. inside a card link). */
  decorative?: boolean
}

/** One photo of an entry with meaningful alt text, or a friendly stand-in when there is none. */
export function EntryPhoto({
  entry,
  index = 0,
  className = '',
  decorative = false,
}: EntryPhotoProps) {
  const { t } = useTranslation()
  const src = entry.photos[index]
  if (!src) {
    return (
      <div
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : t('entry.noPhoto')}
        className={`flex items-center justify-center bg-paper-deep text-5xl ${className}`}
      >
        <span aria-hidden="true">🍽️</span>
      </div>
    )
  }
  const dish = entry.dishes[0]?.name
  const alt = dish
    ? t('entry.photoAltDish', { dish, place: entry.place.name })
    : t('entry.photoAlt', { place: entry.place.name })
  return (
    <img
      src={src}
      alt={decorative ? '' : alt}
      loading="lazy"
      decoding="async"
      className={`object-cover ${className}`}
    />
  )
}
