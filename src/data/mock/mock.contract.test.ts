import { describeRepositoryContract } from '../contract/repositoryContract'
import { createTestRepositories, STORAGE_KEYS } from '@/test/testRepositories'
import { MemoryStorage } from './memoryStorage'

// A clock that moves forward so "most recently added" ordering is well defined.
describeRepositoryContract('mock (localStorage)', () => {
  const storage = new MemoryStorage()
  storage.setItem(STORAGE_KEYS.seedMode, 'empty')
  let tick = 0
  const base = Date.UTC(2026, 9, 7, 12)
  const { repositories } = createTestRepositories({
    storage,
    now: () => new Date(base + tick++ * 1000),
  })
  return Promise.resolve({ repositories })
})
