import type { SupabaseClient } from '@supabase/supabase-js'
import type { Repositories } from '../repositories'
import { createSessionProvider } from './session'
import { createSupabaseAuthService } from './SupabaseAuthService'
import { createSupabaseEntryRepository } from './SupabaseEntryRepository'
import { createSupabaseImageStorage } from './SupabaseImageStorage'
import { createSupabasePlaceRepository } from './SupabasePlaceRepository'
import { createSupabasePreferencesRepository } from './SupabasePreferencesRepository'
import { createSupabaseWishlistRepository } from './SupabaseWishlistRepository'

export { createSupabaseClientFromEnv } from './client'

/** Postgres + Storage repositories. Pass any configured Supabase client (the app's, or a test's). */
export function createSupabaseRepositories(client: SupabaseClient): Repositories {
  const ensureSession = createSessionProvider(client)
  return {
    entries: createSupabaseEntryRepository(client, ensureSession),
    places: createSupabasePlaceRepository(client, ensureSession),
    wishlist: createSupabaseWishlistRepository(client, ensureSession),
    preferences: createSupabasePreferencesRepository(client, ensureSession),
    images: createSupabaseImageStorage(client, ensureSession),
    auth: createSupabaseAuthService(client),
  }
}
