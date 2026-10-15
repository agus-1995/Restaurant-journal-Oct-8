import { isValidISODate } from '@/lib/date'
import { RepositoryError } from '../repositories'
import { PRICE_TIERS, REACTIONS, OCCASIONS, type Entry } from '@/types'

function invalid(message: string): never {
  throw new RepositoryError('invalid', message)
}

/**
 * Cheap guard rails in the spirit of database CHECK constraints. The forms validate with Zod
 * first; this catches programming mistakes (and mirrors what the real DB will enforce).
 */
export function assertValidEntryFields(
  fields: Partial<Pick<Entry, 'date' | 'reaction' | 'priceTier' | 'occasion'>>,
): void {
  if (fields.date !== undefined && !isValidISODate(fields.date)) {
    invalid(`Invalid date "${fields.date}" (expected YYYY-MM-DD)`)
  }
  if (fields.reaction !== undefined && !REACTIONS.includes(fields.reaction)) {
    invalid(`Invalid reaction "${fields.reaction}"`)
  }
  if (fields.priceTier !== undefined && !PRICE_TIERS.includes(fields.priceTier)) {
    invalid(`Invalid price tier "${String(fields.priceTier)}"`)
  }
  if (fields.occasion !== undefined && !OCCASIONS.includes(fields.occasion)) {
    invalid(`Invalid occasion "${fields.occasion}"`)
  }
}

export function assertNonEmpty(value: string, label: string): void {
  if (value.trim() === '') invalid(`${label} must not be empty`)
}
