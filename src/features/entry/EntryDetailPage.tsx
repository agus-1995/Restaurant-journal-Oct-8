import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { PriceBadge, ReactionBadge } from '@/components/EntryBadges'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Modal } from '@/components/Modal'
import { buttonStyles } from '@/components/buttonStyles'
import { useDeleteEntry, useEntryWithPlace } from '@/hooks'
import { errorMessageKey } from '@/lib/errors'
import { formatEntryDate } from '@/lib/format'
import { ShareDialog } from '@/features/share/ShareDialog'
import { PhotoCarousel } from './PhotoCarousel'

function isCelebrateState(state: unknown): boolean {
  return (
    typeof state === 'object' && state !== null && 'celebrate' in state && state.celebrate === true
  )
}

export function EntryDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: entry, isPending, isError, error, refetch } = useEntryWithPlace(id)
  const deleteEntry = useDeleteEntry()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [sharing, setSharing] = useState(false)
  const celebrate = isCelebrateState(location.state)

  if (isPending) return <LoadingState variant="detail" />
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (entry === null || entry === undefined) {
    return (
      <EmptyState
        emoji="🔎"
        title={t('entry.notFound.title')}
        body={t('entry.notFound.body')}
        action={
          <Link to="/" className={buttonStyles('primary')}>
            {t('actions.backToJournal')}
          </Link>
        }
      />
    )
  }

  const { place } = entry
  const date = formatEntryDate(entry.date, i18n.language)
  const hasDetails = entry.dishes.length > 0 || Boolean(entry.notes) || entry.cuisineTags.length > 0

  function confirmDelete() {
    deleteEntry.mutate(entry!.id, { onSuccess: () => navigate('/', { replace: true }) })
  }

  return (
    <article aria-labelledby="entry-title" className="space-y-6">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center gap-1 font-semibold text-ink-soft hover:text-ink"
      >
        <span aria-hidden="true">←</span> {t('entry.back')}
      </Link>

      {celebrate && (
        <div role="status" className="rounded-2xl border-2 border-mustard bg-mustard/30 p-4">
          <p className="font-display text-xl font-semibold">
            <span aria-hidden="true">🎉 </span>
            {t('entry.celebrate.title')}
          </p>
          <p className="mt-1">{t('entry.celebrate.body')}</p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => navigate(location.pathname, { replace: true, state: null })}
          >
            {t('entry.celebrate.dismiss')}
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <PhotoCarousel entry={entry} />

        <div className="space-y-5">
          <header>
            <h1 id="entry-title" className="text-3xl font-semibold md:text-4xl">
              {place.name}
            </h1>
            <p className="mt-1 text-ink-soft">
              {[place.neighborhood, place.city].filter(Boolean).join(', ')} ·{' '}
              {t(`placeType.${place.type}`)}
            </p>
            {place.status === 'closed' && (
              <p className="mt-2 inline-block rounded-full bg-paper-deep px-3 py-1 text-sm font-semibold">
                {t('entry.placeClosed')}
              </p>
            )}
          </header>

          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-lg">
            <li>
              <ReactionBadge reaction={entry.reaction} />
            </li>
            {entry.priceTier && (
              <li>
                <PriceBadge tier={entry.priceTier} />
              </li>
            )}
            {entry.occasion && <li className="text-ink-soft">{t(`occasion.${entry.occasion}`)}</li>}
            <li className="text-ink-soft">{date}</li>
            {entry.isUnusual && (
              <li className="rounded-full bg-mustard px-3 py-0.5 text-base font-semibold text-ink">
                <span aria-hidden="true">✨ </span>
                {t('entry.unusual')}
              </li>
            )}
          </ul>

          {entry.dishes.length > 0 && (
            <section aria-labelledby="dishes-title">
              <h2 id="dishes-title" className="mb-2 text-xl font-semibold">
                {t('entry.dishes')}
              </h2>
              <ul className="space-y-1">
                {entry.dishes.map((dish) => (
                  <li key={dish.name}>
                    <span className="font-semibold">{dish.name}</span>
                    {dish.note && <span className="text-ink-soft"> — {dish.note}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {entry.notes && (
            <section aria-labelledby="notes-title">
              <h2 id="notes-title" className="mb-2 text-xl font-semibold">
                {t('entry.notes')}
              </h2>
              <p className="max-w-prose whitespace-pre-line">{entry.notes}</p>
            </section>
          )}

          {entry.cuisineTags.length > 0 && (
            <section aria-labelledby="cuisine-title">
              <h2 id="cuisine-title" className="mb-2 text-xl font-semibold">
                {t('entry.cuisine')}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {entry.cuisineTags.map((tag) => (
                  <li key={tag}>
                    <Link
                      to={`/search?${new URLSearchParams({ cuisine: tag }).toString()}`}
                      aria-label={t('entry.searchTag', { tag })}
                      className="inline-flex min-h-10 items-center rounded-full bg-paper-deep px-4 text-sm font-semibold hover:bg-line"
                    >
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!hasDetails && (
            <p className="text-ink-soft">
              {t('entry.noDetails')}{' '}
              <Link
                to={`/entry/${entry.id}/edit`}
                className="font-semibold text-terracotta underline"
              >
                {t('entry.addDetails')}
              </Link>
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => setSharing(true)}>{t('actions.share')}</Button>
            <Link to={`/entry/${entry.id}/edit`} className={buttonStyles('secondary')}>
              {t('actions.edit')}
            </Link>
            <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
              {t('actions.delete')}
            </Button>
          </div>
        </div>
      </div>

      {sharing && <ShareDialog entry={entry} onClose={() => setSharing(false)} />}

      {confirmingDelete && (
        <Modal title={t('entry.deleteTitle')} onClose={() => setConfirmingDelete(false)}>
          <p>{t('entry.deleteBody', { place: place.name, date })}</p>
          {deleteEntry.isError && (
            <p role="alert" className="mt-3 font-semibold text-wine">
              {t('entry.deleteFailed')} {t(errorMessageKey(deleteEntry.error))}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
            <Button variant="danger" disabled={deleteEntry.isPending} onClick={confirmDelete}>
              {deleteEntry.isPending ? t('actions.saving') : t('entry.deleteConfirm')}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
              {t('actions.cancel')}
            </Button>
          </div>
        </Modal>
      )}
    </article>
  )
}
