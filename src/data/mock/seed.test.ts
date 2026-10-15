import { toISODate } from '@/lib/date'
import { PLACE_TYPES, REACTIONS } from '@/types'
import { TEST_NOW } from '@/test/testRepositories'
import { buildSeed } from './seed'

describe('seed data', () => {
  const seed = buildSeed(TEST_NOW)

  it('has 10-15 entries', () => {
    expect(seed.entries.length).toBeGreaterThanOrEqual(10)
    expect(seed.entries.length).toBeLessThanOrEqual(15)
  })

  it('uses unique ids and never points at a missing place', () => {
    const placeIds = new Set(seed.places.map((p) => p.id))
    expect(placeIds.size).toBe(seed.places.length)
    expect(new Set(seed.entries.map((e) => e.id)).size).toBe(seed.entries.length)
    for (const entry of seed.entries) expect(placeIds).toContain(entry.placeId)
    for (const item of seed.wishlist) expect(placeIds).toContain(item.placeId)
  })

  it('mixes Buenos Aires and Mendoza, with wineries, street food and unusual finds', () => {
    const byId = new Map(seed.places.map((p) => [p.id, p]))
    const visited = seed.entries.map((e) => byId.get(e.placeId))
    const cities = new Set(visited.map((p) => p?.city))
    const types = new Set(visited.map((p) => p?.type))
    expect(cities).toEqual(new Set(['Buenos Aires', 'Mendoza']))
    expect(types).toContain('winery')
    expect(types).toContain('street_food')
    expect(seed.entries.some((e) => e.isUnusual)).toBe(true)
    expect(seed.entries.some((e) => byId.get(e.placeId)?.name.includes('Bodegón'))).toBe(true)
  })

  it('covers every reaction and several price tiers', () => {
    expect(new Set(seed.entries.map((e) => e.reaction))).toEqual(new Set(REACTIONS))
    expect(new Set(seed.entries.map((e) => e.priceTier)).size).toBeGreaterThanOrEqual(3)
  })

  it('only uses valid place types, has a closed place, and has no future-dated entries', () => {
    for (const place of seed.places) expect(PLACE_TYPES).toContain(place.type)
    expect(seed.places.some((p) => p.status === 'closed')).toBe(true)
    const today = toISODate(TEST_NOW)
    for (const entry of seed.entries) expect(entry.date <= today).toBe(true)
  })

  it('gives every entry at least one photo', () => {
    for (const entry of seed.entries) {
      expect(entry.photos.length).toBeGreaterThan(0)
      expect(entry.photos[0]).toMatch(/^data:image\/svg\+xml/)
    }
  })
})
