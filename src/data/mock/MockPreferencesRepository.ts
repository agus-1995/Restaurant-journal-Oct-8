import type { UserPreferences } from '@/types'
import type { PreferencesRepository } from '../repositories'
import { STORAGE_KEYS, type MockContext } from './context'
import { writeJson } from './storage'

const DEFAULTS: UserPreferences = { onboardingSeen: false }

function read(ctx: MockContext): UserPreferences {
  const raw = ctx.storage.getItem(STORAGE_KEYS.preferences)
  if (raw === null) return { ...DEFAULTS }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return { ...DEFAULTS, ...(parsed as Partial<UserPreferences>) }
    }
  } catch {
    // corrupt: fall back to defaults
  }
  return { ...DEFAULTS }
}

export function createMockPreferencesRepository(ctx: MockContext): PreferencesRepository {
  return {
    get: () => ctx.request(() => read(ctx)),
    update: (patch) =>
      ctx.request(() => {
        const next = { ...read(ctx), ...patch }
        writeJson(ctx, STORAGE_KEYS.preferences, next)
        return next
      }),
  }
}
