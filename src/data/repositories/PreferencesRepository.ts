import type { UpdatePreferencesInput, UserPreferences } from '@/types'

export interface PreferencesRepository {
  /** Always resolves a complete object (defaults applied). */
  get(): Promise<UserPreferences>
  update(patch: UpdatePreferencesInput): Promise<UserPreferences>
}
