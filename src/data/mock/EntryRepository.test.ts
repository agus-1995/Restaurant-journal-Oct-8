import { toISODate } from '@/lib/date'
import { createTestRepositories, TEST_NOW } from '@/test/testRepositories'
import { isRepositoryError, type EntryRepository } from '../repositories'

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the promise to reject')
}

describe('EntryRepository (mock)', () => {
  let entries: EntryRepository
  let setNow: (date: Date) => void

  beforeEach(() => {
    let current = TEST_NOW
    setNow = (date) => {
      current = date
    }
    entries = createTestRepositories({ now: () => current }).repositories.entries
  })

  it('seeds entries on first run and lists them newest first', async () => {
    const list = await entries.list()
    expect(list).toHaveLength(14)
    const dates = list.map((e) => e.date)
    expect(dates).toEqual([...dates].sort().reverse())
    expect(list[0]?.date).toBe(toISODate(new Date(TEST_NOW.getTime() - 24 * 60 * 60 * 1000)))
  })

  it('getById returns the entry, or null when it does not exist', async () => {
    expect((await entries.getById('entry-01'))?.id).toBe('entry-01')
    expect(await entries.getById('nope')).toBeNull()
  })

  it('create needs only placeId, date and reaction, and fills in the rest', async () => {
    const created = await entries.create({
      placeId: 'place-bodegon',
      date: '2026-10-07',
      reaction: 'good',
    })
    expect(created).toMatchObject({
      placeId: 'place-bodegon',
      date: '2026-10-07',
      reaction: 'good',
      photos: [],
      dishes: [],
      cuisineTags: [],
      isUnusual: false,
      createdAt: TEST_NOW.toISOString(),
      updatedAt: TEST_NOW.toISOString(),
    })
    expect(created.id).toBeTruthy()
    expect(created.priceTier).toBeUndefined()
    expect(await entries.getById(created.id)).toEqual(created)
    expect(await entries.list()).toHaveLength(15)
  })

  it('create keeps the optional fields it is given', async () => {
    const created = await entries.create({
      placeId: 'place-cafe',
      date: '2026-10-07',
      reaction: 'loved',
      priceTier: 2,
      occasion: 'friends',
      isUnusual: true,
      dishes: [{ name: 'Tostado' }],
      cuisineTags: ['café'],
      notes: 'Rico',
    })
    expect(created).toMatchObject({
      priceTier: 2,
      occasion: 'friends',
      isUnusual: true,
      dishes: [{ name: 'Tostado' }],
      cuisineTags: ['café'],
      notes: 'Rico',
    })
  })

  it('create rejects an unknown place with not_found', async () => {
    const error = await rejection(
      entries.create({ placeId: 'ghost', date: '2026-10-07', reaction: 'good' }),
    )
    expect(isRepositoryError(error, 'not_found')).toBe(true)
  })

  it.each([
    ['impossible date', { date: '2026-02-31' }],
    ['non-ISO date', { date: '07/10/2026' }],
    ['unknown reaction', { reaction: 'amazing' }],
    ['price tier 4', { priceTier: 4 }],
    ['unknown occasion', { occasion: 'party' }],
  ])('create rejects %s with invalid', async (_label, override) => {
    const input = { placeId: 'place-bodegon', date: '2026-10-07', reaction: 'good', ...override }
    // Deliberately bypass the types: this is what a buggy caller could send.
    const error = await rejection(entries.create(input as Parameters<typeof entries.create>[0]))
    expect(isRepositoryError(error, 'invalid')).toBe(true)
  })

  it('update merges the patch, bumps updatedAt and keeps createdAt', async () => {
    const before = await entries.getById('entry-05')
    setNow(new Date(2026, 9, 8, 9, 0, 0))
    const updated = await entries.update('entry-05', {
      reaction: 'loved',
      notes: 'Mejor que antes',
    })
    expect(updated).toMatchObject({ id: 'entry-05', reaction: 'loved', notes: 'Mejor que antes' })
    expect(updated.dishes).toEqual(before?.dishes)
    expect(updated.createdAt).toBe(before?.createdAt)
    expect(updated.updatedAt).toBe(new Date(2026, 9, 8, 9, 0, 0).toISOString())
    expect(await entries.getById('entry-05')).toEqual(updated)
  })

  it('update with an explicit undefined clears an optional field', async () => {
    expect((await entries.getById('entry-01'))?.priceTier).toBe(2)
    const updated = await entries.update('entry-01', { priceTier: undefined })
    expect(updated.priceTier).toBeUndefined()
    expect((await entries.getById('entry-01'))?.priceTier).toBeUndefined()
  })

  it('update rejects a missing entry (not_found) and a bad value (invalid)', async () => {
    expect(isRepositoryError(await rejection(entries.update('nope', {})), 'not_found')).toBe(true)
    const bad = await rejection(entries.update('entry-01', { date: 'yesterday' }))
    expect(isRepositoryError(bad, 'invalid')).toBe(true)
  })

  it('remove deletes the entry, and removing it again is fine', async () => {
    await entries.remove('entry-02')
    expect(await entries.getById('entry-02')).toBeNull()
    expect(await entries.list()).toHaveLength(13)
    await expect(entries.remove('entry-02')).resolves.toBeUndefined()
    expect(await entries.list()).toHaveLength(13)
  })

  it('returns copies, so mutating a result does not change stored data', async () => {
    const first = await entries.getById('entry-01')
    first?.dishes.push({ name: 'Intruso' })
    const second = await entries.getById('entry-01')
    expect(second?.dishes.map((d) => d.name)).not.toContain('Intruso')
  })
})
