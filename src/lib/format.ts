import type { ISODate, PriceTier } from '@/types'

/** Parses `YYYY-MM-DD` as a LOCAL date (`new Date('2026-10-07')` would be UTC and can shift a day). */
export function parseISODate(value: ISODate): Date {
  const [y = 0, m = 1, d = 1] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "7 oct" for this year, "7 oct 2025" for other years. */
export function formatEntryDate(value: ISODate, language: string, now: Date = new Date()): string {
  const date = parseISODate(value)
  const sameYear = date.getFullYear() === now.getFullYear()
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date)
}

/** "octubre de 2026" / "October 2026" */
export function formatMonthYear(value: ISODate, language: string): string {
  return new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(
    parseISODate(value),
  )
}

/** Currency-free price: 1 → "$", 2 → "$$", 3 → "$$$". */
export function formatPriceTier(tier: PriceTier): string {
  return '$'.repeat(tier)
}
