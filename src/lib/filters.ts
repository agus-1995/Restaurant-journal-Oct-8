import {
  OCCASIONS,
  PRICE_TIERS,
  REACTIONS,
  type EntryWithPlace,
  type Occasion,
  type PriceTier,
  type Reaction,
} from '@/types'
import { normalizeText } from './text'

export interface EntryFilters {
  /** Free text; every word must appear somewhere in the entry (accent-insensitive). */
  query: string
  /** Multi-selects match ANY chosen value; different filters combine with AND. */
  priceTiers: PriceTier[]
  reactions: Reaction[]
  occasions: Occasion[]
  cuisines: string[]
  neighborhood: string | null
  unusualOnly: boolean
}

export const EMPTY_FILTERS: EntryFilters = {
  query: '',
  priceTiers: [],
  reactions: [],
  occasions: [],
  cuisines: [],
  neighborhood: null,
  unusualOnly: false,
}

/** Number of active chip/select filters (the text query is shown separately). */
export function countActiveFilters(filters: EntryFilters): number {
  return (
    (filters.priceTiers.length > 0 ? 1 : 0) +
    (filters.reactions.length > 0 ? 1 : 0) +
    (filters.occasions.length > 0 ? 1 : 0) +
    (filters.cuisines.length > 0 ? 1 : 0) +
    (filters.neighborhood !== null ? 1 : 0) +
    (filters.unusualOnly ? 1 : 0)
  )
}

export function hasAnyFilter(filters: EntryFilters): boolean {
  return filters.query.trim() !== '' || countActiveFilters(filters) > 0
}

function searchableText(entry: EntryWithPlace): string {
  return normalizeText(
    [
      entry.place.name,
      entry.place.neighborhood,
      entry.place.city,
      ...entry.dishes.flatMap((dish) => [dish.name, dish.note]),
      ...entry.cuisineTags,
      entry.notes,
    ]
      .filter((part): part is string => part !== undefined && part !== '')
      .join(' '),
  )
}

export function filterEntries(
  entries: readonly EntryWithPlace[],
  filters: EntryFilters,
): EntryWithPlace[] {
  const words = normalizeText(filters.query).split(/\s+/).filter(Boolean)
  const cuisines = filters.cuisines.map(normalizeText)
  const neighborhood = filters.neighborhood === null ? null : normalizeText(filters.neighborhood)

  return entries.filter((entry) => {
    if (filters.unusualOnly && !entry.isUnusual) return false
    if (filters.reactions.length > 0 && !filters.reactions.includes(entry.reaction)) return false
    if (
      filters.priceTiers.length > 0 &&
      (entry.priceTier === undefined || !filters.priceTiers.includes(entry.priceTier))
    ) {
      return false
    }
    if (
      filters.occasions.length > 0 &&
      (entry.occasion === undefined || !filters.occasions.includes(entry.occasion))
    ) {
      return false
    }
    if (neighborhood !== null && normalizeText(entry.place.neighborhood ?? '') !== neighborhood) {
      return false
    }
    if (cuisines.length > 0) {
      const tags = entry.cuisineTags.map(normalizeText)
      if (!cuisines.some((cuisine) => tags.includes(cuisine))) return false
    }
    if (words.length > 0) {
      const haystack = searchableText(entry)
      if (!words.every((word) => haystack.includes(word))) return false
    }
    return true
  })
}

/** Distinct cuisine tags (case/accent-insensitive), most used first. */
export function collectCuisineTags(entries: readonly EntryWithPlace[]): string[] {
  const counts = new Map<string, { label: string; count: number }>()
  for (const entry of entries) {
    for (const tag of entry.cuisineTags) {
      const key = normalizeText(tag)
      const existing = counts.get(key)
      if (existing) existing.count += 1
      else counts.set(key, { label: tag, count: 1 })
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'))
    .map((item) => item.label)
}

/** Distinct neighborhoods, alphabetical. */
export function collectNeighborhoods(entries: readonly EntryWithPlace[]): string[] {
  const seen = new Map<string, string>()
  for (const entry of entries) {
    const name = entry.place.neighborhood?.trim()
    if (name) seen.set(normalizeText(name), name)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'es'))
}

function splitList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

function pickAllowed<T extends string | number>(values: string[], allowed: readonly T[]): T[] {
  return allowed.filter((candidate) => values.includes(String(candidate)))
}

/** Reads filters from the URL, ignoring anything unknown (so old/hand-edited links never break). */
export function parseFilters(params: URLSearchParams): EntryFilters {
  return {
    query: params.get('q') ?? '',
    priceTiers: pickAllowed(splitList(params.get('price')), PRICE_TIERS),
    reactions: pickAllowed(splitList(params.get('reaction')), REACTIONS),
    occasions: pickAllowed(splitList(params.get('occasion')), OCCASIONS),
    cuisines: params.getAll('cuisine').filter(Boolean),
    neighborhood: params.get('hood') || null,
    unusualOnly: params.get('unusual') === '1',
  }
}

export function serializeFilters(filters: EntryFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query.trim() !== '') params.set('q', filters.query)
  if (filters.priceTiers.length > 0) params.set('price', filters.priceTiers.join(','))
  if (filters.reactions.length > 0) params.set('reaction', filters.reactions.join(','))
  if (filters.occasions.length > 0) params.set('occasion', filters.occasions.join(','))
  for (const cuisine of filters.cuisines) params.append('cuisine', cuisine)
  if (filters.neighborhood !== null) params.set('hood', filters.neighborhood)
  if (filters.unusualOnly) params.set('unusual', '1')
  return params
}
