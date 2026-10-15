import { RepositoryError } from '../repositories'
import { STORAGE_KEYS, type MockContext } from './context'
import { buildSeed } from './seed'

type CollectionKey = 'entries' | 'places' | 'wishlist'

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014)
  )
}

/** Writes JSON, translating a full-storage failure into a friendly `quota_exceeded` error. */
export function writeJson(ctx: MockContext, key: string, value: unknown): void {
  try {
    ctx.storage.setItem(key, JSON.stringify(value))
  } catch (error) {
    if (isQuotaError(error)) {
      throw new RepositoryError('quota_exceeded', 'Browser storage is full', { cause: error })
    }
    throw new RepositoryError('unavailable', 'Could not write to browser storage', { cause: error })
  }
}

/** First run only: fill every collection with demo data (or nothing, if `seed=empty`). */
function ensureSeeded(ctx: MockContext): void {
  if (ctx.storage.getItem(STORAGE_KEYS.seeded) !== null) return
  const startEmpty = ctx.storage.getItem(STORAGE_KEYS.seedMode) === 'empty'
  const seed = startEmpty ? { places: [], entries: [], wishlist: [] } : buildSeed(ctx.now())
  writeJson(ctx, STORAGE_KEYS.places, seed.places)
  writeJson(ctx, STORAGE_KEYS.entries, seed.entries)
  writeJson(ctx, STORAGE_KEYS.wishlist, seed.wishlist)
  writeJson(ctx, STORAGE_KEYS.seeded, true)
}

/**
 * Reads a collection. If the stored JSON is corrupt we keep a copy under `<key>:corrupt`
 * and start that collection fresh, rather than crashing the whole app forever.
 */
export function readCollection<T>(ctx: MockContext, name: CollectionKey): T[] {
  ensureSeeded(ctx)
  const key = STORAGE_KEYS[name]
  const raw = ctx.storage.getItem(key)
  if (raw === null) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as T[]
  } catch {
    // fall through to recovery
  }
  ctx.storage.setItem(`${key}:corrupt`, raw)
  writeJson(ctx, key, [])
  return []
}

export function writeCollection<T>(ctx: MockContext, name: CollectionKey, items: T[]): void {
  writeJson(ctx, STORAGE_KEYS[name], items)
}
