import { createTestRepositories } from '@/test/testRepositories'
import { createMockRepositories } from '.'
import { STORAGE_KEYS } from './context'
import { MemoryStorage } from './memoryStorage'
import { isRepositoryError } from '../repositories'

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the promise to reject')
}

describe('mock infrastructure', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('persistence', () => {
    it('data survives a "reload" (new repositories on the same storage)', async () => {
      const first = createTestRepositories()
      const created = await first.repositories.entries.create({
        placeId: 'place-bodegon',
        date: '2026-10-07',
        reaction: 'loved',
      })
      const reloaded = createTestRepositories({ storage: first.storage }).repositories
      expect(await reloaded.entries.getById(created.id)).toEqual(created)
      expect(await reloaded.entries.list()).toHaveLength(15)
    })

    it('seeds only once: emptying the journal does not bring the demo data back', async () => {
      const { repositories, storage } = createTestRepositories()
      for (const entry of await repositories.entries.list()) {
        await repositories.entries.remove(entry.id)
      }
      const reloaded = createTestRepositories({ storage }).repositories
      expect(await reloaded.entries.list()).toEqual([])
    })

    it('starts empty when the seed switch is "empty"', async () => {
      const storage = new MemoryStorage()
      storage.setItem(STORAGE_KEYS.seedMode, 'empty')
      const { repositories } = createTestRepositories({ storage })
      expect(await repositories.entries.list()).toEqual([])
      expect(await repositories.places.list()).toEqual([])
      expect(await repositories.wishlist.list()).toEqual([])
    })

    it('recovers from corrupt JSON: keeps a copy and starts that collection fresh', async () => {
      const { repositories, storage } = createTestRepositories()
      await repositories.entries.list() // seed
      storage.setItem(STORAGE_KEYS.entries, '{not json')
      expect(await repositories.entries.list()).toEqual([])
      expect(storage.getItem(`${STORAGE_KEYS.entries}:corrupt`)).toBe('{not json')
      expect(await repositories.places.list()).not.toEqual([]) // other collections untouched
    })
  })

  describe('failure injection', () => {
    it('every request fails with "unavailable" while the fail flag is on, and recovers after', async () => {
      const { repositories, storage } = createTestRepositories()
      storage.setItem(STORAGE_KEYS.failFlag, '1')
      expect(isRepositoryError(await errorOf(repositories.entries.list()), 'unavailable')).toBe(
        true,
      )
      expect(isRepositoryError(await errorOf(repositories.places.list()), 'unavailable')).toBe(true)
      storage.removeItem(STORAGE_KEYS.failFlag)
      expect(await repositories.entries.list()).toHaveLength(14)
    })

    it('a failed write changes nothing', async () => {
      const { repositories, storage } = createTestRepositories()
      await repositories.entries.list()
      storage.setItem(STORAGE_KEYS.failFlag, '1')
      await errorOf(repositories.entries.remove('entry-01'))
      storage.removeItem(STORAGE_KEYS.failFlag)
      expect(await repositories.entries.getById('entry-01')).not.toBeNull()
    })
  })

  describe('storage quota', () => {
    class FullStorage extends MemoryStorage {
      full = false
      override setItem(key: string, value: string): void {
        if (this.full) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
        super.setItem(key, value)
      }
    }

    it('reports a full browser storage as quota_exceeded, and keeps the old data', async () => {
      const storage = new FullStorage()
      const { repositories } = createTestRepositories({ storage })
      await repositories.entries.list() // seed while there is room
      storage.full = true
      const error = await errorOf(
        repositories.entries.create({
          placeId: 'place-cafe',
          date: '2026-10-07',
          reaction: 'good',
        }),
      )
      expect(isRepositoryError(error, 'quota_exceeded')).toBe(true)
      storage.full = false
      expect(await repositories.entries.list()).toHaveLength(14)
    })
  })

  describe('simulated latency', () => {
    it('does not respond before the minimum delay, and does after the chosen delay', async () => {
      vi.useFakeTimers()
      const repositories = createMockRepositories({
        storage: new MemoryStorage(),
        latency: { min: 200, max: 500 },
        random: () => 1, // slowest case: 500ms
      })
      let settled = false
      void repositories.entries.list().then(() => {
        settled = true
      })
      await vi.advanceTimersByTimeAsync(499)
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      expect(settled).toBe(true)
    })

    it('uses the minimum delay when the random draw is 0', async () => {
      vi.useFakeTimers()
      const repositories = createMockRepositories({
        storage: new MemoryStorage(),
        latency: { min: 200, max: 500 },
        random: () => 0,
      })
      let settled = false
      void repositories.places.list().then(() => {
        settled = true
      })
      await vi.advanceTimersByTimeAsync(199)
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      expect(settled).toBe(true)
    })
  })
})
