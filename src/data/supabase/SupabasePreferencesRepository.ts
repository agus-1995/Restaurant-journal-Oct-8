import type { SupabaseClient } from '@supabase/supabase-js'
import type { PreferencesRepository } from '../repositories'
import { unwrap } from './errors'
import { preferencesToRow, rowToPreferences, type PreferencesRow } from './mappers'

export function createSupabasePreferencesRepository(
  client: SupabaseClient,
  ensureSession: () => Promise<string>,
): PreferencesRepository {
  const table = () => client.from('user_preferences')

  async function read(): Promise<PreferencesRow | null> {
    // Row-level security already limits this to the signed-in user's single row.
    return unwrap<PreferencesRow | null>(await table().select('*').maybeSingle(), 'read')
  }

  return {
    async get() {
      await ensureSession()
      return rowToPreferences(await read())
    },

    async update(patch) {
      const userId = await ensureSession()
      const current = rowToPreferences(await read())
      const row = preferencesToRow(current, patch, userId)
      unwrap<PreferencesRow>(
        await table().upsert(row, { onConflict: 'user_id' }).select().single(),
        'write',
      )
      return rowToPreferences(row)
    },
  }
}
