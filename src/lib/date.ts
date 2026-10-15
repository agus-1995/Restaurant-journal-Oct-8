import type { ISODate } from '@/types'

/** Local calendar date as `YYYY-MM-DD` (not UTC, so "today" matches the user's day). */
export function toISODate(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** True for real calendar dates only (rejects `2026-02-31`). */
export function isValidISODate(value: string): boolean {
  const match = ISO_DATE.exec(value)
  if (!match) return false
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}
