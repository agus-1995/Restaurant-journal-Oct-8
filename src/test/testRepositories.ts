import { createMockRepositories, MemoryStorage, STORAGE_KEYS, type MockOptions } from '@/data/mock'
import { buildSeed } from '@/data/mock/seed'
import type { Repositories } from '@/data/repositories'

/** Re-exported so tests never import the mock layer directly. */
export { buildSeed, STORAGE_KEYS }

/** Fixed clock so seed dates are deterministic: Wed 2026-10-07, noon local time. */
export const TEST_NOW = new Date(2026, 9, 7, 12, 0, 0)

export interface TestRepositories {
  repositories: Repositories
  storage: MemoryStorage
}

/** Isolated, instant (no latency) mock repositories on in-memory storage. */
export function createTestRepositories(options: MockOptions = {}): TestRepositories {
  const storage = options.storage instanceof MemoryStorage ? options.storage : new MemoryStorage()
  const repositories = createMockRepositories({
    latency: false,
    now: () => TEST_NOW,
    compressImage: (file) => Promise.resolve(`data:image/jpeg;base64,fake-${file.size}`),
    ...options,
    storage,
  })
  return { repositories, storage }
}
