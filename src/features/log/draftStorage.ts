import { OCCASIONS, PLACE_TYPES, PRICE_TIERS, REACTIONS } from '@/types'
import type { LogFormValues } from '@/features/entryForm/schema'

const KEY = 'mi-diario:draft:log'

export interface LogDraft {
  step: number
  values: Partial<LogFormValues>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringList(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined
}

function oneOf<T extends string | number>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value)
}

function sanitizePlace(value: unknown): LogFormValues['place'] | undefined {
  if (!isRecord(value)) return undefined
  if (value.kind === 'existing' && typeof value.placeId === 'string' && value.placeId) {
    return { kind: 'existing', placeId: value.placeId }
  }
  if (value.kind === 'new') {
    return {
      kind: 'new',
      name: typeof value.name === 'string' ? value.name : '',
      city: typeof value.city === 'string' ? value.city : '',
      neighborhood: typeof value.neighborhood === 'string' ? value.neighborhood : '',
      type: oneOf(value.type, PLACE_TYPES) ?? 'restaurant',
    }
  }
  return undefined
}

/**
 * The draft comes from storage we don't control (older versions, hand edits), so every field
 * is checked individually and bad ones are dropped instead of crashing the form.
 */
function sanitizeValues(raw: Record<string, unknown>): Partial<LogFormValues> {
  const values: Partial<LogFormValues> = {}
  const place = sanitizePlace(raw.place)
  if (place) values.place = place
  if (typeof raw.date === 'string') values.date = raw.date
  const photos = stringList(raw.photos)
  if (photos) values.photos = photos
  const reaction = oneOf(raw.reaction, REACTIONS)
  if (reaction) values.reaction = reaction
  const dishes = stringList(raw.dishes)
  if (dishes) values.dishes = dishes
  const priceTier = oneOf(raw.priceTier, PRICE_TIERS)
  if (priceTier) values.priceTier = priceTier
  const occasion = oneOf(raw.occasion, OCCASIONS)
  if (occasion) values.occasion = occasion
  if (typeof raw.isUnusual === 'boolean') values.isUnusual = raw.isUnusual
  const tags = stringList(raw.cuisineTags)
  if (tags) values.cuisineTags = tags
  if (typeof raw.notes === 'string') values.notes = raw.notes
  return values
}

export function loadDraft(): LogDraft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || !isRecord(parsed.values)) return null
    const step =
      typeof parsed.step === 'number' && parsed.step >= 1 && parsed.step <= 3 ? parsed.step : 1
    return { step, values: sanitizeValues(parsed.values) }
  } catch {
    return null
  }
}

export function saveDraft(draft: LogDraft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // Storage full or blocked: the draft just won't survive leaving the page.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
