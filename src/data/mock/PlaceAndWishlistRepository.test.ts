import { createTestRepositories } from '@/test/testRepositories'
import { isRepositoryError, type Repositories } from '../repositories'

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the promise to reject')
}

describe('PlaceRepository (mock)', () => {
  let repos: Repositories
  beforeEach(() => {
    repos = createTestRepositories().repositories
  })

  it('lists places alphabetically', async () => {
    const names = (await repos.places.list()).map((p) => p.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')))
    expect(names.length).toBeGreaterThan(10)
  })

  it('create only needs a name and city, defaulting to an open restaurant', async () => {
    const place = await repos.places.create({ name: '  La Esquina  ', city: 'Rosario' })
    expect(place).toMatchObject({
      name: 'La Esquina',
      city: 'Rosario',
      type: 'restaurant',
      status: 'open',
    })
    expect(await repos.places.getById(place.id)).toEqual(place)
  })

  it('create rejects a blank name or city', async () => {
    expect(
      isRepositoryError(await errorOf(repos.places.create({ name: ' ', city: 'X' })), 'invalid'),
    ).toBe(true)
    expect(
      isRepositoryError(await errorOf(repos.places.create({ name: 'X', city: '' })), 'invalid'),
    ).toBe(true)
  })

  it('update changes fields; a missing place is not_found', async () => {
    const updated = await repos.places.update('place-cuyano', { status: 'closed' })
    expect(updated.status).toBe('closed')
    expect(isRepositoryError(await errorOf(repos.places.update('nope', {})), 'not_found')).toBe(
      true,
    )
  })

  it('remove is blocked (conflict) while an entry or a wishlist item uses the place', async () => {
    const usedByEntry = await errorOf(repos.places.remove('place-bodegon'))
    const usedByWishlist = await errorOf(repos.places.remove('place-chicho'))
    expect(isRepositoryError(usedByEntry, 'conflict')).toBe(true)
    expect(isRepositoryError(usedByWishlist, 'conflict')).toBe(true)
    expect(await repos.places.getById('place-bodegon')).not.toBeNull()
  })

  it('remove works once nothing references the place', async () => {
    const place = await repos.places.create({ name: 'Efímero', city: 'Salta' })
    await repos.places.remove(place.id)
    expect(await repos.places.getById(place.id)).toBeNull()
  })

  it('a place frees up once its wishlist item is removed', async () => {
    await repos.wishlist.remove('wish-01')
    await expect(repos.places.remove('place-chicho')).resolves.toBeUndefined()
  })
})

describe('WishlistRepository (mock)', () => {
  let repos: Repositories
  beforeEach(() => {
    repos = createTestRepositories().repositories
  })

  it('lists the most recently added first', async () => {
    const ids = (await repos.wishlist.list()).map((w) => w.id)
    expect(ids).toEqual(['wish-03', 'wish-01', 'wish-02'])
  })

  it('create needs an existing place', async () => {
    const created = await repos.wishlist.create({
      placeId: 'place-cafe',
      note: 'Probar el cortado',
    })
    expect(created).toMatchObject({ placeId: 'place-cafe', note: 'Probar el cortado' })
    expect((await repos.wishlist.list())[0]?.id).toBe(created.id)
    const error = await errorOf(repos.wishlist.create({ placeId: 'ghost' }))
    expect(isRepositoryError(error, 'not_found')).toBe(true)
  })

  it('update edits the note; a missing item is not_found', async () => {
    const updated = await repos.wishlist.update('wish-02', { note: 'Reservar con tiempo' })
    expect(updated.note).toBe('Reservar con tiempo')
    expect(isRepositoryError(await errorOf(repos.wishlist.update('nope', {})), 'not_found')).toBe(
      true,
    )
  })

  it('remove deletes the item and is idempotent', async () => {
    await repos.wishlist.remove('wish-01')
    await repos.wishlist.remove('wish-01')
    expect(await repos.wishlist.getById('wish-01')).toBeNull()
    expect(await repos.wishlist.list()).toHaveLength(2)
  })
})

describe('PreferencesRepository (mock)', () => {
  it('starts with defaults, merges updates, and persists them', async () => {
    const { repositories, storage } = createTestRepositories()
    expect(await repositories.preferences.get()).toEqual({ onboardingSeen: false })
    await repositories.preferences.update({ lastOccasion: 'friends' })
    await repositories.preferences.update({ lastCity: 'Mendoza' })
    const reloaded = createTestRepositories({ storage }).repositories
    expect(await reloaded.preferences.get()).toEqual({
      onboardingSeen: false,
      lastOccasion: 'friends',
      lastCity: 'Mendoza',
    })
  })
})

describe('ImageStorage (mock)', () => {
  it('returns the compressed data URL for an image', async () => {
    const { repositories } = createTestRepositories()
    const file = new Blob(['12345'], { type: 'image/png' })
    expect(await repositories.images.upload(file)).toBe('data:image/jpeg;base64,fake-5')
  })

  it('rejects files that are not images', async () => {
    const { repositories } = createTestRepositories()
    const error = await errorOf(repositories.images.upload(new Blob(['x'], { type: 'text/plain' })))
    expect(isRepositoryError(error, 'invalid')).toBe(true)
  })

  it('remove resolves for any url', async () => {
    const { repositories } = createTestRepositories()
    await expect(repositories.images.remove('data:image/jpeg;base64,abc')).resolves.toBeUndefined()
  })
})
