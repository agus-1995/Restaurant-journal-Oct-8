import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EntryPhoto } from '@/components/EntryPhoto'
import type { EntryWithPlace } from '@/types'

/** Swipeable photos (scroll-snap) with dot buttons for pointer/keyboard users. */
export function PhotoCarousel({ entry }: { entry: EntryWithPlace }) {
  const { t } = useTranslation()
  const scroller = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const total = Math.max(entry.photos.length, 1)

  function goTo(index: number) {
    const node = scroller.current
    if (node) node.scrollTo({ left: index * node.clientWidth, behavior: 'smooth' })
  }

  return (
    <div role="group" aria-roledescription="carousel" aria-label={t('entry.photos')}>
      <div className="overflow-hidden rounded-sm border border-line bg-card shadow-polaroid">
        <div
          ref={scroller}
          role="region"
          aria-label={t('entry.photos')}
          // Scrollable regions must be focusable so keyboard users can scroll them (WCAG 2.1.1).
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          onScroll={(event) => {
            const node = event.currentTarget
            setCurrent(Math.round(node.scrollLeft / Math.max(node.clientWidth, 1)))
          }}
          className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto"
        >
          {Array.from({ length: total }, (_, index) => (
            <div
              key={index}
              role="group"
              aria-roledescription="slide"
              aria-label={t('entry.photoCount', { current: index + 1, total })}
              className="w-full shrink-0 snap-center p-2"
            >
              <EntryPhoto
                entry={entry}
                index={index}
                className="aspect-[4/3] w-full rounded-[2px]"
              />
            </div>
          ))}
        </div>
      </div>
      {total > 1 && (
        <div className="mt-2 flex justify-center">
          {Array.from({ length: total }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={t('entry.photoCount', { current: index + 1, total })}
              aria-current={index === current}
              onClick={() => goTo(index)}
              className="flex size-11 items-center justify-center"
            >
              <span
                aria-hidden="true"
                className={`block size-2.5 rounded-full ${index === current ? 'bg-terracotta' : 'bg-line'}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
