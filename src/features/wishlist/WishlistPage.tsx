import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { defaultCity } from '@/features/entryForm/defaultCity'
import { PlacePicker } from '@/features/entryForm/PlacePicker'
import { placeSelectionSchema } from '@/features/entryForm/schema'
import {
  useAddWishlistItem,
  useCreatePlace,
  useEntries,
  usePlaces,
  usePreferences,
  useRemoveWishlistItem,
  useWishlistWithPlaces,
} from '@/hooks'
import { buttonStyles } from '@/components/buttonStyles'
import { errorMessageKey } from '@/lib/errors'
import { formatEntryDate } from '@/lib/format'
import type { WishlistItemWithPlace } from '@/types'

const wishlistFormSchema = z.object({
  place: placeSelectionSchema,
  note: z.string().trim().max(200).optional(),
  source: z.string().trim().max(80).optional(),
})
type WishlistFormValues = z.infer<typeof wishlistFormSchema>

export function WishlistPage() {
  const { t } = useTranslation()
  const { data, isPending, isError, error, refetch } = useWishlistWithPlaces()
  const [adding, setAdding] = useState(false)

  return (
    <section aria-labelledby="wishlist-title" className="space-y-5">
      <header className="flex items-baseline justify-between gap-4">
        <h1 id="wishlist-title" className="text-3xl font-semibold md:text-4xl">
          {t('wishlist.title')}
        </h1>
        {data && data.length > 0 && (
          <p className="text-sm text-ink-soft">{t('wishlist.count', { count: data.length })}</p>
        )}
      </header>

      <Button
        variant={adding ? 'secondary' : 'primary'}
        aria-expanded={adding}
        aria-controls="wishlist-add"
        onClick={() => setAdding((open) => !open)}
      >
        <span aria-hidden="true">{adding ? '×' : '＋'}</span> {t('wishlist.addTitle')}
      </Button>

      {adding && <AddForm onDone={() => setAdding(false)} />}

      {isPending && <LoadingState variant="list" />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}

      {data && data.length === 0 && !adding && (
        <EmptyState emoji="🔖" title={t('wishlist.empty.title')} body={t('wishlist.empty.body')} />
      )}

      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((item) => (
            <li key={item.id}>
              <WishlistRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function WishlistRow({ item }: { item: WishlistItemWithPlace }) {
  const { t, i18n } = useTranslation()
  const remove = useRemoveWishlistItem()
  const location = [item.place.neighborhood, item.place.city].filter(Boolean).join(', ')
  return (
    <article className="rounded-2xl border border-line bg-card p-4 shadow-polaroid">
      <h2 className="font-display text-xl font-semibold">{item.place.name}</h2>
      <p className="text-sm text-ink-soft">
        {location} · {t(`placeType.${item.place.type}`)}
      </p>
      {item.note && <p className="mt-2">{item.note}</p>}
      <p className="mt-2 text-sm text-ink-soft">
        {item.source && <span>{t('wishlist.from', { source: item.source })} · </span>}
        {t('wishlist.addedOn', { date: formatEntryDate(item.addedAt.slice(0, 10), i18n.language) })}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={`/log?wishlist=${item.id}`}
          aria-label={t('wishlist.logItAria', { place: item.place.name })}
          className={buttonStyles('primary')}
        >
          {t('wishlist.logIt')}
        </Link>
        <Button
          variant="ghost"
          aria-label={t('wishlist.removeAria', { place: item.place.name })}
          disabled={remove.isPending}
          onClick={() => remove.mutate(item.id)}
        >
          {t('wishlist.remove')}
        </Button>
      </div>
      {remove.isError && (
        <p role="alert" className="mt-2 text-sm font-semibold text-wine">
          {t(errorMessageKey(remove.error))}
        </p>
      )}
    </article>
  )
}

function AddForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const places = usePlaces()
  const entries = useEntries()
  const preferences = usePreferences()
  const createPlace = useCreatePlace()
  const addItem = useAddWishlistItem()
  const [submitError, setSubmitError] = useState<unknown>(null)
  const { control, register, handleSubmit, formState } = useForm<WishlistFormValues>({
    resolver: zodResolver(wishlistFormSchema),
    defaultValues: { note: '', source: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      let placeId: string
      if (values.place.kind === 'existing') {
        placeId = values.place.placeId
      } else {
        const created = await createPlace.mutateAsync({
          name: values.place.name,
          city: values.place.city,
          neighborhood: values.place.neighborhood?.trim() || undefined,
          type: values.place.type,
        })
        placeId = created.id
      }
      await addItem.mutateAsync({
        placeId,
        note: values.note || undefined,
        source: values.source || undefined,
      })
      onDone()
    } catch (error) {
      setSubmitError(error)
    }
  })

  const inputClass = 'border-line bg-paper min-h-12 w-full rounded-2xl border-2 px-4 text-base'

  return (
    <form
      id="wishlist-add"
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      className="space-y-5 rounded-3xl border border-line bg-card p-4"
    >
      <Controller
        control={control}
        name="place"
        render={({ field }) => (
          <PlacePicker
            places={places.data ?? []}
            recentPlaceIds={[]}
            value={field.value}
            onChange={field.onChange}
            defaultCity={defaultCity(places.data ?? [], entries.data ?? [], preferences.data)}
            showErrors={formState.isSubmitted}
          />
        )}
      />
      <div>
        <label htmlFor="wishlist-note" className="mb-1 block font-semibold">
          {t('wishlist.note')}
        </label>
        <input
          id="wishlist-note"
          className={inputClass}
          placeholder={t('wishlist.notePlaceholder')}
          {...register('note')}
        />
      </div>
      <div>
        <label htmlFor="wishlist-source" className="mb-1 block font-semibold">
          {t('wishlist.source')}
        </label>
        <input
          id="wishlist-source"
          className={inputClass}
          placeholder={t('wishlist.sourcePlaceholder')}
          {...register('source')}
        />
      </div>
      {submitError !== null && (
        <p role="alert" className="font-semibold text-wine">
          {t('wishlist.addFailed')} {t(errorMessageKey(submitError))}
        </p>
      )}
      <Button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? t('actions.saving') : t('wishlist.add')}
      </Button>
    </form>
  )
}
