import { isValidISODate } from '@/lib/date'
import { RepositoryError } from '../repositories'
import type {
  CreateEntryInput,
  CreatePlaceInput,
  CreateWishlistItemInput,
  Dish,
  Entry,
  Occasion,
  Place,
  PlaceStatus,
  PlaceType,
  PriceTier,
  Reaction,
  UpdateEntryInput,
  UpdatePlaceInput,
  UpdatePreferencesInput,
  UpdateWishlistItemInput,
  UserPreferences,
  WishlistItem,
} from '@/types'

/** Row shapes as they come out of Postgres (snake_case, nulls instead of missing). */
export interface PlaceRow {
  id: string
  name: string
  neighborhood: string | null
  city: string
  type: PlaceType
  status: PlaceStatus
  address: string | null
  maps_url: string | null
  created_at: string
}

export interface EntryRow {
  id: string
  place_id: string
  date: string
  photos: string[]
  dishes: unknown
  price_tier: number | null
  reaction: Reaction
  is_unusual: boolean
  occasion: Occasion | null
  cuisine_tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WishlistRow {
  id: string
  place_id: string
  note: string | null
  source: string | null
  added_at: string
}

export interface PreferencesRow {
  user_id: string
  last_occasion: Occasion | null
  last_city: string | null
  onboarding_seen: boolean
}

/** Postgres returns `2026-10-08T12:00:00+00:00`; the app uses `toISOString()` (`…Z`) everywhere. */
function toIso(value: string): string {
  return new Date(value).toISOString()
}

function toDishes(value: unknown): Dish[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item): Dish[] => {
    if (typeof item !== 'object' || item === null || !('name' in item)) return []
    const name = typeof item.name === 'string' ? item.name : ''
    if (name === '') return []
    const note =
      'note' in item && typeof item.note === 'string' && item.note !== '' ? item.note : undefined
    return [note ? { name, note } : { name }]
  })
}

/** Writes only the keys the caller actually passed; `undefined` on an optional column clears it. */
function patchRow(
  patch: object,
  columns: Record<string, { column: string; nullable: boolean }>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [key, { column, nullable }] of Object.entries(columns)) {
    if (!(key in patch)) continue
    const value = (patch as Record<string, unknown>)[key]
    if (value === undefined) {
      if (nullable) row[column] = null // explicit undefined = clear the field
      continue // required columns can't be cleared; ignore
    }
    row[column] = value
  }
  return row
}

// ---------------------------------------------------------------- places

export function rowToPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    neighborhood: row.neighborhood ?? undefined,
    city: row.city,
    type: row.type,
    status: row.status,
    address: row.address ?? undefined,
    mapsUrl: row.maps_url ?? undefined,
    createdAt: toIso(row.created_at),
  }
}

export function placeToInsertRow(input: CreatePlaceInput): Record<string, unknown> {
  return {
    name: input.name.trim(),
    city: input.city.trim(),
    neighborhood: input.neighborhood?.trim() || null,
    type: input.type ?? 'restaurant',
    status: input.status ?? 'open',
    address: input.address ?? null,
    maps_url: input.mapsUrl ?? null,
  }
}

export function placePatchToRow(patch: UpdatePlaceInput): Record<string, unknown> {
  return patchRow(patch, {
    name: { column: 'name', nullable: false },
    city: { column: 'city', nullable: false },
    neighborhood: { column: 'neighborhood', nullable: true },
    type: { column: 'type', nullable: false },
    status: { column: 'status', nullable: false },
    address: { column: 'address', nullable: true },
    mapsUrl: { column: 'maps_url', nullable: true },
  })
}

// ---------------------------------------------------------------- entries

export function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    placeId: row.place_id,
    date: row.date,
    photos: row.photos ?? [],
    dishes: toDishes(row.dishes),
    priceTier: (row.price_tier ?? undefined) as PriceTier | undefined,
    reaction: row.reaction,
    isUnusual: row.is_unusual,
    occasion: row.occasion ?? undefined,
    cuisineTags: row.cuisine_tags ?? [],
    notes: row.notes ?? undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

/**
 * Postgres happily parses words like 'yesterday' or 'infinity' as dates, so the format is checked
 * here (strict `YYYY-MM-DD`, a real calendar day) to behave exactly like the local mock.
 */
function assertIsoDate(value: string): void {
  if (!isValidISODate(value)) {
    throw new RepositoryError('invalid', `Invalid date "${value}" (expected YYYY-MM-DD)`)
  }
}

export function entryToInsertRow(input: CreateEntryInput): Record<string, unknown> {
  assertIsoDate(input.date)
  return {
    place_id: input.placeId,
    date: input.date,
    reaction: input.reaction,
    photos: input.photos ?? [],
    dishes: input.dishes ?? [],
    price_tier: input.priceTier ?? null,
    is_unusual: input.isUnusual ?? false,
    occasion: input.occasion ?? null,
    cuisine_tags: input.cuisineTags ?? [],
    notes: input.notes ?? null,
  }
}

export function entryPatchToRow(patch: UpdateEntryInput): Record<string, unknown> {
  if (patch.date !== undefined) assertIsoDate(patch.date)
  return patchRow(patch, {
    placeId: { column: 'place_id', nullable: false },
    date: { column: 'date', nullable: false },
    reaction: { column: 'reaction', nullable: false },
    photos: { column: 'photos', nullable: false },
    dishes: { column: 'dishes', nullable: false },
    priceTier: { column: 'price_tier', nullable: true },
    isUnusual: { column: 'is_unusual', nullable: false },
    occasion: { column: 'occasion', nullable: true },
    cuisineTags: { column: 'cuisine_tags', nullable: false },
    notes: { column: 'notes', nullable: true },
  })
}

// ---------------------------------------------------------------- wishlist

export function rowToWishlistItem(row: WishlistRow): WishlistItem {
  return {
    id: row.id,
    placeId: row.place_id,
    note: row.note ?? undefined,
    source: row.source ?? undefined,
    addedAt: toIso(row.added_at),
  }
}

export function wishlistToInsertRow(input: CreateWishlistItemInput): Record<string, unknown> {
  return { place_id: input.placeId, note: input.note ?? null, source: input.source ?? null }
}

export function wishlistPatchToRow(patch: UpdateWishlistItemInput): Record<string, unknown> {
  return patchRow(patch, {
    note: { column: 'note', nullable: true },
    source: { column: 'source', nullable: true },
  })
}

// ---------------------------------------------------------------- preferences

export const DEFAULT_PREFERENCES: UserPreferences = { onboardingSeen: false }

export function rowToPreferences(row: PreferencesRow | null): UserPreferences {
  if (!row) return { ...DEFAULT_PREFERENCES }
  return {
    lastOccasion: row.last_occasion ?? undefined,
    lastCity: row.last_city ?? undefined,
    onboardingSeen: row.onboarding_seen,
  }
}

/** Preferences are merged client-side then written whole (upsert), matching the mock's semantics. */
export function preferencesToRow(
  current: UserPreferences,
  patch: UpdatePreferencesInput,
  userId: string,
): PreferencesRow {
  const next = { ...current, ...patch }
  return {
    user_id: userId,
    last_occasion: next.lastOccasion ?? null,
    last_city: next.lastCity ?? null,
    onboarding_seen: next.onboardingSeen,
  }
}
