import { compressImage } from '@/lib/image'
import { RepositoryError } from '../repositories'
import { MemoryStorage, type KeyValueStorage } from './memoryStorage'

export const STORAGE_KEYS = {
  entries: 'mi-diario:v1:entries',
  places: 'mi-diario:v1:places',
  wishlist: 'mi-diario:v1:wishlist',
  preferences: 'mi-diario:v1:preferences',
  /** Set once the first-run seed has been applied, so emptied collections stay empty. */
  seeded: 'mi-diario:v1:seeded',
  /** Dev switch: set to `1` to make every request fail (to see error states). */
  failFlag: 'mi-diario:fail',
  /** Dev switch: set to `empty` before first run to start with no data (to see empty states). */
  seedMode: 'mi-diario:seed',
} as const

export interface MockOptions {
  /** Defaults to `localStorage` (or memory when it is unavailable). */
  storage?: KeyValueStorage
  /** Simulated network latency in ms. `false` disables it (tests). Default 200-500. */
  latency?: false | { min: number; max: number }
  random?: () => number
  now?: () => Date
  /** Defaults to canvas-based `compressImage`; tests inject a fake. */
  compressImage?: (file: Blob) => Promise<string>
  /** Defaults to reading the `mi-diario:fail` flag from storage on every request. */
  shouldFail?: () => boolean
}

export interface MockContext {
  storage: KeyValueStorage
  now: () => Date
  compressImage: (file: Blob) => Promise<string>
  /**
   * Runs `operation` like a network request: waits the simulated latency, may fail, then
   * performs the work synchronously so each read-modify-write is atomic.
   */
  request<T>(operation: () => T | Promise<T>): Promise<T>
}

function resolveDefaultStorage(): KeyValueStorage {
  try {
    const storage = globalThis.localStorage
    storage.getItem(STORAGE_KEYS.seeded) // throws when storage access is blocked
    return storage
  } catch {
    return new MemoryStorage()
  }
}

export function createMockContext(options: MockOptions = {}): MockContext {
  const storage = options.storage ?? resolveDefaultStorage()
  const latency = options.latency === undefined ? { min: 200, max: 500 } : options.latency
  const random = options.random ?? Math.random
  const shouldFail = options.shouldFail ?? (() => storage.getItem(STORAGE_KEYS.failFlag) === '1')

  return {
    storage,
    now: options.now ?? (() => new Date()),
    compressImage: options.compressImage ?? ((file) => compressImage(file)),
    request<T>(operation: () => T | Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const run = () => {
          try {
            if (shouldFail()) {
              throw new RepositoryError('unavailable', 'Simulated request failure')
            }
            resolve(operation())
          } catch (error) {
            reject(error)
          }
        }
        if (latency === false) queueMicrotask(run)
        else setTimeout(run, latency.min + random() * (latency.max - latency.min))
      })
    },
  }
}
