import type { SupabaseClient } from '@supabase/supabase-js'
import { RepositoryError } from '../repositories'

/**
 * Resolves the signed-in user's id, or throws `unauthorized` when nobody is signed in (the app
 * redirects to the login screen before any data is requested, so this is a safety net: for
 * example when a session expires while the page is open).
 */
export function createSessionProvider(client: SupabaseClient): () => Promise<string> {
  return async () => {
    const { data, error } = await client.auth.getSession()
    if (error) {
      throw new RepositoryError('unavailable', error.message, { cause: error })
    }
    if (!data.session) throw new RepositoryError('unauthorized', 'You are not signed in')
    return data.session.user.id
  }
}
