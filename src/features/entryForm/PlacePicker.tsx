import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/Button'
import { PlaceTypeField } from '@/components/choiceFields'
import { normalizeText } from '@/lib/text'
import type { Place } from '@/types'
import type { PlaceSelection } from './schema'

interface PlacePickerProps {
  places: readonly Place[]
  /** Most recently logged places, newest first: one-tap choices. */
  recentPlaceIds: readonly string[]
  value: PlaceSelection | undefined
  onChange: (value: PlaceSelection | undefined) => void
  /** Pre-fills the city when creating a new place (the last city used). */
  defaultCity: string
  /** Set once the user tried to continue: shows what is missing. */
  showErrors?: boolean
}

const MAX_MATCHES = 5

function placeLine(place: Place): string {
  return [place.neighborhood, place.city].filter(Boolean).join(', ')
}

/**
 * Pick an existing place (recent chips or type-to-search) or define a new one inline.
 * Presentational: the parent supplies the data, so it works for both quick-log and the wishlist.
 */
export function PlacePicker({
  places,
  recentPlaceIds,
  value,
  onChange,
  defaultCity,
  showErrors = false,
}: PlacePickerProps) {
  const { t } = useTranslation()
  const inputId = useId()
  const [query, setQuery] = useState('')

  if (value?.kind === 'existing') {
    const place = places.find((p) => p.id === value.placeId)
    return (
      <div>
        <p className="mb-2 text-base font-semibold">{t('placePicker.chosen')}</p>
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-card p-4">
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-semibold">{place?.name}</p>
            {place && <p className="truncate text-sm text-ink-soft">{placeLine(place)}</p>}
          </div>
          <Button variant="ghost" onClick={() => onChange(undefined)}>
            {t('placePicker.change')}
          </Button>
        </div>
      </div>
    )
  }

  if (value?.kind === 'new') {
    const nameMissing = showErrors && value.name.trim() === ''
    const cityMissing = showErrors && value.city.trim() === ''
    const inputClass = 'border-line bg-card min-h-12 w-full rounded-2xl border-2 px-4 text-base'
    return (
      <div className="space-y-4 rounded-2xl border-2 border-ink bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">
            <span aria-hidden="true">📍 </span>
            {t('placePicker.newPlace')}
          </p>
          <Button variant="ghost" onClick={() => onChange(undefined)}>
            {t('placePicker.change')}
          </Button>
        </div>
        <div>
          <label htmlFor={`${inputId}-name`} className="mb-1 block font-semibold">
            {t('placePicker.name')}
          </label>
          <input
            id={`${inputId}-name`}
            className={inputClass}
            value={value.name}
            aria-invalid={nameMissing || undefined}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
          />
          {nameMissing && (
            <p role="alert" className="mt-1 text-sm font-semibold text-wine">
              {t('validation.nameRequired')}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${inputId}-city`} className="mb-1 block font-semibold">
            {t('placePicker.city')}
          </label>
          <input
            id={`${inputId}-city`}
            className={inputClass}
            value={value.city}
            autoComplete="address-level2"
            aria-invalid={cityMissing || undefined}
            onChange={(event) => onChange({ ...value, city: event.target.value })}
          />
          {cityMissing && (
            <p role="alert" className="mt-1 text-sm font-semibold text-wine">
              {t('validation.cityRequired')}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${inputId}-hood`} className="mb-1 block font-semibold">
            {t('placePicker.neighborhood')}
          </label>
          <input
            id={`${inputId}-hood`}
            className={inputClass}
            value={value.neighborhood ?? ''}
            placeholder={t('placePicker.neighborhoodPlaceholder')}
            onChange={(event) => onChange({ ...value, neighborhood: event.target.value })}
          />
        </div>
        <PlaceTypeField
          value={value.type}
          onChange={(type) => type && onChange({ ...value, type })}
        />
      </div>
    )
  }

  const normalizedQuery = normalizeText(query)
  const matches =
    normalizedQuery === ''
      ? []
      : places
          .filter((place) => normalizeText(place.name).includes(normalizedQuery))
          .slice(0, MAX_MATCHES)
  const exactMatch = places.some((place) => normalizeText(place.name) === normalizedQuery)
  const recent = recentPlaceIds
    .map((id) => places.find((place) => place.id === id))
    .filter((place): place is Place => place !== undefined)
    .slice(0, MAX_MATCHES)
  const missing = showErrors && query.trim() === ''

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-base font-semibold">
        {t('placePicker.label')}
      </label>
      <input
        id={inputId}
        type="text"
        value={query}
        autoComplete="off"
        enterKeyHint="search"
        placeholder={t('placePicker.placeholder')}
        aria-invalid={missing || undefined}
        aria-describedby={missing ? `${inputId}-error` : undefined}
        onChange={(event) => setQuery(event.target.value)}
        className="min-h-14 w-full rounded-2xl border-2 border-line bg-card px-4 text-lg"
      />
      {missing && (
        <p id={`${inputId}-error`} role="alert" className="mt-1 text-sm font-semibold text-wine">
          {t('validation.placeRequired')}
        </p>
      )}

      {normalizedQuery === '' && recent.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-ink-soft">{t('placePicker.recent')}</p>
          <ul className="flex flex-wrap gap-2">
            {recent.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  onClick={() => onChange({ kind: 'existing', placeId: place.id })}
                  className="min-h-12 rounded-full bg-paper-deep px-4 text-sm font-semibold hover:bg-line"
                >
                  {place.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {normalizedQuery !== '' && (
        <div className="mt-3">
          {matches.length > 0 && (
            <>
              <p className="mb-1 text-sm font-semibold text-ink-soft">{t('placePicker.matches')}</p>
              <ul className="space-y-2">
                {matches.map((place) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      onClick={() => onChange({ kind: 'existing', placeId: place.id })}
                      className="flex min-h-14 w-full flex-col items-start justify-center rounded-2xl border-2 border-line bg-card px-4 text-left hover:border-ink"
                    >
                      <span className="font-semibold">{place.name}</span>
                      <span className="text-sm text-ink-soft">{placeLine(place)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!exactMatch && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  kind: 'new',
                  name: query.trim(),
                  city: defaultCity,
                  neighborhood: '',
                  type: 'restaurant',
                })
              }
              className="mt-2 min-h-14 w-full rounded-2xl border-2 border-dashed border-terracotta px-4 text-left font-semibold text-terracotta"
            >
              <span aria-hidden="true">＋ </span>
              {t('placePicker.create', { name: query.trim() })}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
