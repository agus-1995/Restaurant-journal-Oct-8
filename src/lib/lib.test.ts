import { isValidISODate, toISODate } from './date'
import { newId } from './id'
import { joinEntriesWithPlaces, joinWishlistWithPlaces } from './join'
import { buildSeed, TEST_NOW } from '@/test/testRepositories'

describe('toISODate / isValidISODate', () => {
  it('formats the LOCAL calendar day (not UTC)', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(toISODate(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31')
  })

  it.each([
    ['2026-10-07', true],
    ['2024-02-29', true],
    ['2026-02-29', false],
    ['2026-13-01', false],
    ['2026-1-1', false],
    ['hoy', false],
  ])('isValidISODate(%s) is %s', (value, expected) => {
    expect(isValidISODate(value)).toBe(expected)
  })
})

describe('newId', () => {
  it('returns unique ids', () => {
    expect(new Set(Array.from({ length: 200 }, () => newId())).size).toBe(200)
  })

  it('still works where crypto.randomUUID is missing (http on a phone)', () => {
    vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array) => a.fill(171) })
    expect(newId()).toBe('ab'.repeat(16))
    vi.unstubAllGlobals()
  })
})

describe('joins', () => {
  const { entries, places, wishlist } = buildSeed(TEST_NOW)

  it('attaches the place to each entry', () => {
    const joined = joinEntriesWithPlaces(entries, places)
    expect(joined).toHaveLength(entries.length)
    expect(joined[0]?.place.id).toBe(joined[0]?.placeId)
  })

  it('drops entries and wishlist items whose place is missing', () => {
    expect(joinEntriesWithPlaces(entries, [])).toEqual([])
    expect(joinWishlistWithPlaces(wishlist, places.slice(0, 1))).toEqual([])
  })
})
