import type { Repositories } from '../repositories'
import { createMockContext, type MockOptions } from './context'
import { createMockAuthService } from './MockAuthService'
import { createMockEntryRepository } from './MockEntryRepository'
import { createMockImageStorage } from './MockImageStorage'
import { createMockPlaceRepository } from './MockPlaceRepository'
import { createMockPreferencesRepository } from './MockPreferencesRepository'
import { createMockWishlistRepository } from './MockWishlistRepository'

export { MemoryStorage, type KeyValueStorage } from './memoryStorage'
export { STORAGE_KEYS, type MockOptions } from './context'
export { LOCAL_USER } from './MockAuthService'

/** localStorage-backed repositories with simulated latency, seeded on first run. */
export function createMockRepositories(options: MockOptions = {}): Repositories {
  const ctx = createMockContext(options)
  return {
    entries: createMockEntryRepository(ctx),
    places: createMockPlaceRepository(ctx),
    wishlist: createMockWishlistRepository(ctx),
    preferences: createMockPreferencesRepository(ctx),
    images: createMockImageStorage(ctx),
    auth: createMockAuthService(),
  }
}
