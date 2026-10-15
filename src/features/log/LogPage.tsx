import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Controller, useForm, useWatch, type DefaultValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { OccasionField, PriceTierField, ReactionField } from '@/components/choiceFields'
import { PhotoField } from '@/components/PhotoField'
import { TagInput } from '@/components/TagInput'
import { DateField, NotesField, UnusualField } from '@/features/entryForm/fields'
import { toCreateInput } from '@/features/entryForm/mapping'
import { defaultCity } from '@/features/entryForm/defaultCity'
import { PlacePicker } from '@/features/entryForm/PlacePicker'
import {
  logFormSchema,
  placeSelectionSchema,
  type LogFormValues,
} from '@/features/entryForm/schema'
import { useValidationMessage } from '@/features/entryForm/useValidationMessage'
import {
  useCreateEntry,
  useCreatePlace,
  useEntries,
  usePlaces,
  usePreferences,
  useRemoveWishlistItem,
  useUpdatePreferences,
  useWishlistWithPlaces,
} from '@/hooks'
import { todayISO } from '@/lib/date'
import { errorMessageKey } from '@/lib/errors'
import { MAX_CUISINE_TAGS, MAX_DISHES } from '@/lib/limits'
import type { Entry, Place, UserPreferences, WishlistItemWithPlace } from '@/types'
import { clearDraft, loadDraft, saveDraft } from './draftStorage'

const TOTAL_STEPS = 3
const STEP_KEYS = ['place', 'dish', 'extras'] as const

export function LogPage() {
  const [searchParams] = useSearchParams()
  // Bumping this remounts the form, which is the reliable way to get a truly blank one.
  const [session, setSession] = useState(0)
  const places = usePlaces()
  const entries = useEntries()
  const preferences = usePreferences()
  const wishlist = useWishlistWithPlaces()

  const queries = [places, entries, preferences, wishlist]
  const failed = queries.find((query) => query.isError)
  if (failed) {
    return (
      <ErrorState error={failed.error} onRetry={() => queries.forEach((q) => void q.refetch())} />
    )
  }
  if (!places.data || !entries.data || !preferences.data || !wishlist.data) {
    return <LoadingState variant="detail" />
  }

  const wishlistId = searchParams.get('wishlist')
  const wishlistItem = wishlistId ? wishlist.data.find((item) => item.id === wishlistId) : undefined

  return (
    <LogForm
      key={session}
      onStartOver={() => setSession((n) => n + 1)}
      places={places.data}
      entries={entries.data}
      preferences={preferences.data}
      wishlistItem={wishlistItem}
    />
  )
}

interface LogFormProps {
  onStartOver: () => void
  places: Place[]
  entries: Entry[]
  preferences: UserPreferences
  wishlistItem: WishlistItemWithPlace | undefined
}

function recentPlaceIds(entries: readonly Entry[]): string[] {
  // `entries` arrives newest-first, so the first sighting of each place is its latest visit.
  return [...new Set(entries.map((entry) => entry.placeId))]
}

function LogForm({ onStartOver, places, entries, preferences, wishlistItem }: LogFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const message = useValidationMessage()
  const createPlace = useCreatePlace()
  const createEntry = useCreateEntry()
  const updatePreferences = useUpdatePreferences()
  const removeWishlistItem = useRemoveWishlistItem()

  const cityDefault = defaultCity(places, entries, preferences)

  // Decided once: start from the wishlist item, a saved draft, or a blank form with smart defaults.
  const [initial] = useState(() => {
    const blank = emptyValues(preferences)
    if (wishlistItem) {
      return {
        values: { ...blank, place: { kind: 'existing', placeId: wishlistItem.placeId } as const },
        step: 1,
        restored: false,
      }
    }
    const draft = loadDraft()
    if (draft) return { values: { ...blank, ...draft.values }, step: draft.step, restored: true }
    return { values: blank, step: 1, restored: false }
  })

  const { control, handleSubmit, trigger, getValues } = useForm<LogFormValues>({
    resolver: zodResolver(logFormSchema),
    defaultValues: initial.values,
  })

  const restored = initial.restored
  const [placeAttempted, setPlaceAttempted] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const submitted = useRef(false)
  const createdPlaceId = useRef<string | null>(null)

  // Step lives in the URL so the browser's Back button walks through the steps.
  const stepParam = Number(searchParams.get('step') ?? 1)
  const requestedStep = Number.isInteger(stepParam)
    ? Math.min(Math.max(stepParam, 1), TOTAL_STEPS)
    : 1
  const place = useWatch({ control, name: 'place' })
  const placeValid = placeSelectionSchema.safeParse(place).success
  const step = requestedStep > 1 && !placeValid ? 1 : requestedStep

  function goToStep(next: number, replace = false) {
    setSearchParams(
      (params) => {
        const updated = new URLSearchParams(params)
        updated.set('step', String(next))
        return updated
      },
      { replace },
    )
  }

  useEffect(() => {
    if (initial.restored && initial.step > 1 && !searchParams.has('step')) {
      goToStep(initial.step, true)
    }
    // Only on mount: resume the draft where the user left off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autosave the draft shortly after every change.
  const watched = useWatch({ control })
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!submitted.current) saveDraft({ step, values: getValues() })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [watched, step, getValues])

  async function nextFromPlace() {
    setPlaceAttempted(true)
    if (await trigger('place')) goToStep(2)
  }

  async function nextFromDish() {
    if (await trigger('reaction')) goToStep(3)
  }

  // Built on submit (not during render) because it reads refs.
  const save = (event: FormEvent<HTMLFormElement>) =>
    handleSubmit(async (values) => {
      setSubmitError(null)
      setSaving(true)
      try {
        let placeId: string
        if (values.place.kind === 'existing') {
          placeId = values.place.placeId
        } else if (createdPlaceId.current) {
          placeId = createdPlaceId.current // a previous attempt already created it: don't duplicate
        } else {
          const created = await createPlace.mutateAsync({
            name: values.place.name,
            city: values.place.city,
            neighborhood: values.place.neighborhood?.trim() || undefined,
            type: values.place.type,
          })
          createdPlaceId.current = created.id
          placeId = created.id
        }
        const entry = await createEntry.mutateAsync(toCreateInput(values, placeId))

        // Best-effort follow-ups: the entry is already saved, so these must not fail the flow.
        const city =
          values.place.kind === 'new'
            ? values.place.city
            : places.find((p) => p.id === placeId)?.city
        await updatePreferences
          .mutateAsync({ lastOccasion: values.occasion, lastCity: city, onboardingSeen: true })
          .catch(() => undefined)
        if (wishlistItem)
          await removeWishlistItem.mutateAsync(wishlistItem.id).catch(() => undefined)

        submitted.current = true
        clearDraft()
        navigate(`/entry/${entry.id}`, {
          replace: true,
          state: entries.length === 0 ? { celebrate: true } : null,
        })
      } catch (error) {
        setSubmitError(error)
        setSaving(false)
      }
    })(event)

  function startOver() {
    clearDraft()
    goToStep(1, true)
    onStartOver()
  }

  const stepTitle = t(`log.step${step as 1 | 2 | 3}`)

  return (
    <section aria-labelledby="log-title" className="mx-auto max-w-xl pb-28 md:pb-0">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <h1 id="log-title" className="text-lg font-semibold text-ink-soft">
            {t('log.title')}
          </h1>
          <Link
            to="/"
            aria-label={t('log.close')}
            className="flex size-12 items-center justify-center rounded-full text-2xl text-ink-soft hover:bg-paper-deep"
          >
            <span aria-hidden="true">×</span>
          </Link>
        </div>
        <div
          className="mt-2"
          role="group"
          aria-label={t('log.stepOf', { current: step, total: TOTAL_STEPS })}
        >
          <ol className="flex gap-2" aria-hidden="true">
            {STEP_KEYS.map((key, index) => (
              <li
                key={key}
                className={`h-2 flex-1 rounded-full ${index < step ? 'bg-terracotta' : 'bg-line'}`}
              />
            ))}
          </ol>
          <p className="mt-2 text-sm font-semibold text-ink-soft">
            {t('log.stepOf', { current: step, total: TOTAL_STEPS })}
          </p>
        </div>
        <h2 className="mt-1 font-display text-3xl font-semibold">{stepTitle}</h2>
      </header>

      {restored && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-paper-deep p-3"
        >
          <p className="font-semibold">{t('log.draftRestored')}</p>
          <Button variant="ghost" onClick={startOver}>
            {t('log.startOver')}
          </Button>
        </div>
      )}
      {wishlistItem && (
        <p className="mb-5 rounded-2xl bg-paper-deep p-3 font-semibold">
          <span aria-hidden="true">🔖 </span>
          {t('log.fromWishlist', { place: wishlistItem.place.name })}
        </p>
      )}

      <form onSubmit={(event) => void save(event)} noValidate className="space-y-6">
        {step === 1 && (
          <>
            <Controller
              control={control}
              name="place"
              render={({ field }) => (
                <PlacePicker
                  places={places}
                  recentPlaceIds={recentPlaceIds(entries)}
                  value={field.value}
                  onChange={field.onChange}
                  defaultCity={cityDefault}
                  showErrors={placeAttempted}
                />
              )}
            />
            <Controller
              control={control}
              name="photos"
              render={({ field }) => <PhotoField photos={field.value} onChange={field.onChange} />}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Controller
              control={control}
              name="dishes"
              render={({ field }) => (
                <TagInput
                  label={t('form.dishes')}
                  values={field.value}
                  onChange={field.onChange}
                  placeholder={t('form.dishesPlaceholder')}
                  hint={t('form.dishesHint')}
                  addLabel={t('form.addDish')}
                  removeLabel={(tag) => t('form.removeTag', { tag })}
                  max={MAX_DISHES}
                />
              )}
            />
            <Controller
              control={control}
              name="priceTier"
              render={({ field }) => (
                <PriceTierField value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="reaction"
              render={({ field, fieldState }) => (
                <ReactionField
                  value={field.value}
                  onChange={field.onChange}
                  error={message(fieldState.error?.message)}
                />
              )}
            />
          </>
        )}

        {step === 3 && (
          <>
            <p className="-mt-3 text-sm text-ink-soft">{t('log.optional')}</p>
            <Controller
              control={control}
              name="occasion"
              render={({ field }) => (
                <OccasionField value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="date"
              render={({ field, fieldState }) => (
                <DateField
                  value={field.value}
                  onChange={field.onChange}
                  error={message(fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name="isUnusual"
              render={({ field }) => <UnusualField value={field.value} onChange={field.onChange} />}
            />
            <Controller
              control={control}
              name="cuisineTags"
              render={({ field }) => (
                <TagInput
                  label={t('form.cuisine')}
                  values={field.value}
                  onChange={field.onChange}
                  placeholder={t('form.cuisinePlaceholder')}
                  hint={t('form.cuisineHint')}
                  addLabel={t('form.addCuisine')}
                  removeLabel={(tag) => t('form.removeTag', { tag })}
                  max={MAX_CUISINE_TAGS}
                />
              )}
            />
            <Controller
              control={control}
              name="notes"
              render={({ field, fieldState }) => (
                <NotesField
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={message(fieldState.error?.message)}
                />
              )}
            />
          </>
        )}

        {submitError !== null && (
          <p role="alert" className="font-semibold text-wine">
            {t('log.saveFailed')} {t(errorMessageKey(submitError))}
          </p>
        )}

        {/* Thumb-zone action bar: pinned to the bottom on phones, inline on larger screens. */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:pb-0">
          <div className="mx-auto flex max-w-xl gap-2">
            {step > 1 && (
              <Button
                variant="ghost"
                aria-label={t('actions.back')}
                onClick={() => goToStep(step - 1)}
                className="px-4"
              >
                <span aria-hidden="true">←</span>
                <span className="hidden sm:inline">{t('actions.back')}</span>
              </Button>
            )}
            {step === 1 && (
              <Button className="flex-1" onClick={() => void nextFromPlace()}>
                {t('actions.next')}
              </Button>
            )}
            {step === 2 && (
              <>
                <Button
                  variant="secondary"
                  className="flex-1 px-4 whitespace-nowrap"
                  onClick={() => void nextFromDish()}
                >
                  {t('actions.next')}
                </Button>
                <Button
                  type="submit"
                  className="flex-[1.4] px-4 whitespace-nowrap"
                  disabled={saving}
                >
                  {saving ? t('actions.saving') : t('log.saveNow')}
                </Button>
              </>
            )}
            {step === 3 && (
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? t('actions.saving') : t('log.saveEntry')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </section>
  )
}

/** A fresh form: today's date and the last-used occasion as smart defaults. */
function emptyValues(preferences: UserPreferences): DefaultValues<LogFormValues> {
  return {
    place: undefined,
    date: todayISO(),
    photos: [],
    reaction: undefined,
    dishes: [],
    priceTier: undefined,
    occasion: preferences.lastOccasion,
    isUnusual: false,
    cuisineTags: [],
    notes: '',
  }
}
