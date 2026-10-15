import type { Occasion } from './entry'

/** Small per-user settings that power the quick-log smart defaults. */
export interface UserPreferences {
  lastOccasion?: Occasion
  lastCity?: string
  onboardingSeen: boolean
}

export type UpdatePreferencesInput = Partial<UserPreferences>
