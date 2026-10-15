import { isRepositoryError, type Repositories, type RepositoryErrorCode } from '../repositories'

/** A valid UUID that no row has: works for the mock (any string) and for Postgres (uuid columns). */
const MISSING_ID = '00000000-0000-4000-8000-000000000000'

export interface ContractSubject {
  repositories: Repositories
  /** Empties everything the tests created (used when the same database is reused between tests). */
  cleanup?: () => Promise<void>
}

async function codeOf(promise: Promise<unknown>): Promise<RepositoryErrorCode | 'no error'> {
  try {
    await promise
  } catch (error) {
    return isRepositoryError(error) ? error.code : 'no error'
  }
  return 'no error'
}

/** Empties a repository set through its own public API (children before parents). */
export async function emptyRepositories({ wishlist, entries, places, preferences }: Repositories) {
  for (const item of await wishlist.list()) await wishlist.remove(item.id)
  for (const entry of await entries.list()) await entries.remove(entry.id)
  for (const place of await places.list()) await places.remove(place.id)
  await preferences.update({ lastOccasion: undefined, lastCity: undefined, onboardingSeen: false })
}

/**
 * The behaviour every data source must have. It runs against the mock in every `npm test` and
 * against real Supabase when credentials are provided, so the two cannot drift apart.
 * Each test starts from an EMPTY database.
 */
export function describeRepositoryContract(
  label: string,
  createSubject: () => Promise<ContractSubject>,
  { skip = false }: { skip?: boolean } = {},
) {
  describe.skipIf(skip)(`repository contract: ${label}`, () => {
    let repos: Repositories
    let subject: ContractSubject

    beforeEach(async () => {
      subject = await createSubject()
      repos = subject.repositories
      await subject.cleanup?.()
    })

    afterAll(async () => {
      await subject?.cleanup?.()
    })

    async function newPlace(name = 'La Parri', city = 'Rosario') {
      return repos.places.create({ name, city })
    }

    describe('places', () => {
      it('starts empty', async () => {
        expect(await repos.places.list()).toEqual([])
      })

      it('creates with defaults, trims, and reads back identically', async () => {
        const place = await repos.places.create({ name: '  La Parri ', city: ' Rosario ' })
        expect(place).toMatchObject({
          name: 'La Parri',
          city: 'Rosario',
          type: 'restaurant',
          status: 'open',
        })
        expect(place.id).toBeTruthy()
        expect(place.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/)
        expect(await repos.places.getById(place.id)).toEqual(place)
      })

      it('keeps optional fields', async () => {
        const place = await repos.places.create({
          name: 'Bodega X',
          city: 'Mendoza',
          neighborhood: 'Luján de Cuyo',
          type: 'winery',
          status: 'closed',
        })
        expect(place).toMatchObject({
          neighborhood: 'Luján de Cuyo',
          type: 'winery',
          status: 'closed',
        })
      })

      it('lists alphabetically (accent-aware)', async () => {
        await newPlace('Zeta')
        await newPlace('Árbol')
        await newPlace('Mate')
        expect((await repos.places.list()).map((p) => p.name)).toEqual(['Árbol', 'Mate', 'Zeta'])
      })

      it('rejects a blank name or city', async () => {
        expect(await codeOf(repos.places.create({ name: '  ', city: 'X' }))).toBe('invalid')
        expect(await codeOf(repos.places.create({ name: 'X', city: '' }))).toBe('invalid')
      })

      it('updates, and clears an optional field with undefined', async () => {
        const place = await repos.places.create({ name: 'A', city: 'B', neighborhood: 'Palermo' })
        const updated = await repos.places.update(place.id, {
          status: 'closed',
          neighborhood: undefined,
        })
        expect(updated.status).toBe('closed')
        expect(updated.neighborhood).toBeUndefined()
        expect((await repos.places.getById(place.id))?.neighborhood).toBeUndefined()
      })

      it('unknown ids: getById is null, update is not_found', async () => {
        expect(await repos.places.getById(MISSING_ID)).toBeNull()
        expect(await repos.places.getById('not-a-uuid')).toBeNull()
        expect(await codeOf(repos.places.update(MISSING_ID, { name: 'x' }))).toBe('not_found')
      })

      it('cannot be removed while an entry or a wishlist item uses it (conflict)', async () => {
        const used = await newPlace('Used')
        const wished = await newPlace('Wished')
        const entry = await repos.entries.create({
          placeId: used.id,
          date: '2026-10-07',
          reaction: 'good',
        })
        const item = await repos.wishlist.create({ placeId: wished.id })
        expect(await codeOf(repos.places.remove(used.id))).toBe('conflict')
        expect(await codeOf(repos.places.remove(wished.id))).toBe('conflict')
        await repos.entries.remove(entry.id)
        await repos.wishlist.remove(item.id)
        await repos.places.remove(used.id)
        expect(await repos.places.getById(used.id)).toBeNull()
      })

      it('removing an unknown place is a no-op', async () => {
        await expect(repos.places.remove(MISSING_ID)).resolves.toBeUndefined()
      })
    })

    describe('entries', () => {
      it('creates with only place, date and reaction, filling the defaults', async () => {
        const place = await newPlace()
        const entry = await repos.entries.create({
          placeId: place.id,
          date: '2026-10-07',
          reaction: 'good',
        })
        expect(entry).toMatchObject({
          placeId: place.id,
          date: '2026-10-07',
          reaction: 'good',
          photos: [],
          dishes: [],
          cuisineTags: [],
          isUnusual: false,
        })
        expect(entry.priceTier).toBeUndefined()
        expect(entry.occasion).toBeUndefined()
        expect(entry.notes).toBeUndefined()
        expect(entry.createdAt).toMatch(/Z$/)
        expect(await repos.entries.getById(entry.id)).toEqual(entry)
      })

      it('stores every field and reads it back identically', async () => {
        const place = await newPlace()
        const entry = await repos.entries.create({
          placeId: place.id,
          date: '2026-10-07',
          reaction: 'loved',
          photos: ['https://example.test/a.jpg', 'https://example.test/b.jpg'],
          dishes: [{ name: 'Milanesa', note: 'enorme' }, { name: 'Flan' }],
          priceTier: 3,
          isUnusual: true,
          occasion: 'friends',
          cuisineTags: ['argentina', 'bodegón'],
          notes: 'Volvería mañana',
        })
        expect(entry).toMatchObject({
          photos: ['https://example.test/a.jpg', 'https://example.test/b.jpg'],
          dishes: [{ name: 'Milanesa', note: 'enorme' }, { name: 'Flan' }],
          priceTier: 3,
          isUnusual: true,
          occasion: 'friends',
          cuisineTags: ['argentina', 'bodegón'],
          notes: 'Volvería mañana',
        })
        expect(await repos.entries.getById(entry.id)).toEqual(entry)
      })

      it('lists newest first by date', async () => {
        const place = await newPlace()
        for (const date of ['2026-01-01', '2026-03-01', '2026-02-01']) {
          await repos.entries.create({ placeId: place.id, date, reaction: 'good' })
        }
        expect((await repos.entries.list()).map((e) => e.date)).toEqual([
          '2026-03-01',
          '2026-02-01',
          '2026-01-01',
        ])
      })

      it('rejects an unknown place (not_found)', async () => {
        expect(
          await codeOf(
            repos.entries.create({ placeId: MISSING_ID, date: '2026-10-07', reaction: 'good' }),
          ),
        ).toBe('not_found')
      })

      it('rejects invalid values (invalid)', async () => {
        const place = await newPlace()
        const create = (overrides: object) =>
          repos.entries.create({
            placeId: place.id,
            date: '2026-10-07',
            reaction: 'good',
            ...overrides,
          } as Parameters<typeof repos.entries.create>[0])
        expect(await codeOf(create({ date: '2026-02-31' }))).toBe('invalid')
        expect(await codeOf(create({ reaction: 'amazing' }))).toBe('invalid')
        expect(await codeOf(create({ priceTier: 4 }))).toBe('invalid')
        expect(await codeOf(create({ occasion: 'party' }))).toBe('invalid')
        expect(await repos.entries.list()).toEqual([])
      })

      it('updates fields, keeps createdAt and never moves updatedAt backwards', async () => {
        const place = await newPlace()
        const entry = await repos.entries.create({
          placeId: place.id,
          date: '2026-10-07',
          reaction: 'good',
          notes: 'antes',
        })
        const updated = await repos.entries.update(entry.id, {
          reaction: 'loved',
          notes: 'después',
        })
        expect(updated).toMatchObject({ reaction: 'loved', notes: 'después', date: '2026-10-07' })
        expect(updated.createdAt).toBe(entry.createdAt)
        expect(updated.updatedAt >= entry.updatedAt).toBe(true)
        expect(await repos.entries.getById(entry.id)).toEqual(updated)
      })

      it('clears optional fields when updated with undefined', async () => {
        const place = await newPlace()
        const entry = await repos.entries.create({
          placeId: place.id,
          date: '2026-10-07',
          reaction: 'good',
          priceTier: 2,
          occasion: 'solo',
          notes: 'x',
        })
        await repos.entries.update(entry.id, {
          priceTier: undefined,
          occasion: undefined,
          notes: undefined,
        })
        const reloaded = await repos.entries.getById(entry.id)
        expect(reloaded?.priceTier).toBeUndefined()
        expect(reloaded?.occasion).toBeUndefined()
        expect(reloaded?.notes).toBeUndefined()
      })

      it('an empty update returns the entry unchanged', async () => {
        const place = await newPlace()
        const entry = await repos.entries.create({
          placeId: place.id,
          date: '2026-10-07',
          reaction: 'good',
        })
        expect((await repos.entries.update(entry.id, {})).id).toBe(entry.id)
      })

      it('unknown ids: getById is null, update is not_found', async () => {
        expect(await repos.entries.getById(MISSING_ID)).toBeNull()
        expect(await repos.entries.getById('not-a-uuid')).toBeNull()
        expect(await codeOf(repos.entries.update(MISSING_ID, { reaction: 'meh' }))).toBe(
          'not_found',
        )
      })

      it('rejects invalid values on update (invalid)', async () => {
        const place = await newPlace()
        const entry = await repos.entries.create({
          placeId: place.id,
          date: '2026-10-07',
          reaction: 'good',
        })
        expect(await codeOf(repos.entries.update(entry.id, { date: 'yesterday' }))).toBe('invalid')
        expect((await repos.entries.getById(entry.id))?.date).toBe('2026-10-07')
      })

      it('removes, and removing again (or an unknown id) is a no-op', async () => {
        const place = await newPlace()
        const entry = await repos.entries.create({
          placeId: place.id,
          date: '2026-10-07',
          reaction: 'good',
        })
        await repos.entries.remove(entry.id)
        await expect(repos.entries.remove(entry.id)).resolves.toBeUndefined()
        await expect(repos.entries.remove('not-a-uuid')).resolves.toBeUndefined()
        expect(await repos.entries.getById(entry.id)).toBeNull()
        expect(await repos.entries.list()).toEqual([])
      })
    })

    describe('wishlist', () => {
      it('creates, reads back, and lists the most recently added first', async () => {
        const first = await repos.wishlist.create({
          placeId: (await newPlace('Uno')).id,
          note: 'primero',
        })
        const second = await repos.wishlist.create({
          placeId: (await newPlace('Dos')).id,
          source: 'Cami',
        })
        expect(second).toMatchObject({ source: 'Cami' })
        expect(await repos.wishlist.getById(first.id)).toEqual(first)
        expect((await repos.wishlist.list()).map((w) => w.id)).toEqual([second.id, first.id])
      })

      it('rejects an unknown place (not_found)', async () => {
        expect(await codeOf(repos.wishlist.create({ placeId: MISSING_ID }))).toBe('not_found')
      })

      it('updates the note/source, and clears them with undefined', async () => {
        const item = await repos.wishlist.create({
          placeId: (await newPlace()).id,
          note: 'a',
          source: 'b',
        })
        expect(await repos.wishlist.update(item.id, { note: 'nueva' })).toMatchObject({
          note: 'nueva',
          source: 'b',
        })
        expect((await repos.wishlist.update(item.id, { source: undefined })).source).toBeUndefined()
        expect(await codeOf(repos.wishlist.update(MISSING_ID, { note: 'x' }))).toBe('not_found')
      })

      it('removes idempotently', async () => {
        const item = await repos.wishlist.create({ placeId: (await newPlace()).id })
        await repos.wishlist.remove(item.id)
        await expect(repos.wishlist.remove(item.id)).resolves.toBeUndefined()
        expect(await repos.wishlist.getById(item.id)).toBeNull()
        expect(await repos.wishlist.getById('not-a-uuid')).toBeNull()
      })
    })

    describe('preferences', () => {
      it('start with defaults, merge updates, and clear with undefined', async () => {
        expect(await repos.preferences.get()).toEqual({ onboardingSeen: false })
        await repos.preferences.update({ lastOccasion: 'friends' })
        await repos.preferences.update({ lastCity: 'Mendoza', onboardingSeen: true })
        expect(await repos.preferences.get()).toEqual({
          lastOccasion: 'friends',
          lastCity: 'Mendoza',
          onboardingSeen: true,
        })
        await repos.preferences.update({ lastOccasion: undefined })
        expect((await repos.preferences.get()).lastOccasion).toBeUndefined()
        expect((await repos.preferences.get()).lastCity).toBe('Mendoza')
      })
    })

    describe('images', () => {
      it('rejects files that are not images', async () => {
        expect(await codeOf(repos.images.upload(new Blob(['x'], { type: 'text/plain' })))).toBe(
          'invalid',
        )
      })

      it('remove accepts any url without failing', async () => {
        await expect(repos.images.remove('data:image/jpeg;base64,abc')).resolves.toBeUndefined()
      })
    })
  })
}
