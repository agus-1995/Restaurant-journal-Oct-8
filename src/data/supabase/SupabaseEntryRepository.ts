import type { SupabaseClient } from '@supabase/supabase-js'
import { isRepositoryError, RepositoryError, type EntryRepository } from '../repositories'
import { ignoreNotFound, unwrap } from './errors'
import { entryPatchToRow, entryToInsertRow, rowToEntry, type EntryRow } from './mappers'
import { removeStoredPhotos } from './SupabaseImageStorage'

export function createSupabaseEntryRepository(
  client: SupabaseClient,
  ensureSession: () => Promise<string>,
): EntryRepository {
  const entries = () => client.from('entries')

  async function photosOf(id: string): Promise<string[]> {
    try {
      const row = unwrap<Pick<EntryRow, 'photos'> | null>(
        await entries().select('photos').eq('id', id).maybeSingle(),
        'read',
      )
      return row?.photos ?? []
    } catch {
      return [] // only used for cleanup; never let it block the real operation
    }
  }

  return {
    async list() {
      await ensureSession()
      const rows = unwrap<EntryRow[]>(
        await entries()
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
        'read',
      )
      return rows.map(rowToEntry)
    },

    async getById(id) {
      await ensureSession()
      try {
        const row = unwrap<EntryRow | null>(
          await entries().select('*').eq('id', id).maybeSingle(),
          'read',
        )
        return row ? rowToEntry(row) : null
      } catch (error) {
        if (isRepositoryError(error, 'not_found')) return null // e.g. an id that is not a UUID
        throw error
      }
    },

    async create(input) {
      await ensureSession()
      const row = unwrap<EntryRow>(
        await entries().insert(entryToInsertRow(input)).select().single(),
        'write',
      )
      return rowToEntry(row)
    },

    async update(id, patch) {
      await ensureSession()
      const changes = entryPatchToRow(patch)
      const previousPhotos = 'photos' in changes ? await photosOf(id) : []
      const query =
        Object.keys(changes).length > 0
          ? entries().update(changes).eq('id', id).select().maybeSingle()
          : entries().select('*').eq('id', id).maybeSingle()
      const row = unwrap<EntryRow | null>(await query, 'write')
      if (!row) throw new RepositoryError('not_found', `Entry "${id}" does not exist`)

      // Photos the user removed in this edit are deleted from Storage (best effort).
      const kept = new Set(row.photos)
      await removeStoredPhotos(
        client,
        previousPhotos.filter((url) => !kept.has(url)),
      )
      return rowToEntry(row)
    },

    async remove(id) {
      await ensureSession()
      const photos = await photosOf(id)
      await ignoreNotFound(async () => {
        unwrap(await entries().delete().eq('id', id), 'delete')
      })
      await removeStoredPhotos(client, photos)
    },
  }
}
