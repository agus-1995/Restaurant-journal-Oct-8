import type { SupabaseClient } from '@supabase/supabase-js'
import type { Place } from '@/types'
import { isRepositoryError, RepositoryError, type PlaceRepository } from '../repositories'
import { ignoreNotFound, unwrap } from './errors'
import { placePatchToRow, placeToInsertRow, rowToPlace, type PlaceRow } from './mappers'

export function createSupabasePlaceRepository(
  client: SupabaseClient,
  ensureSession: () => Promise<string>,
): PlaceRepository {
  const places = () => client.from('places')

  return {
    async list() {
      await ensureSession()
      const rows = unwrap<PlaceRow[]>(await places().select('*'), 'read')
      // Sorted here (not in SQL) so the order matches the mock: Spanish collation, accent-aware.
      return rows.map(rowToPlace).sort((a: Place, b: Place) => a.name.localeCompare(b.name, 'es'))
    },

    async getById(id) {
      await ensureSession()
      try {
        const row = unwrap<PlaceRow | null>(
          await places().select('*').eq('id', id).maybeSingle(),
          'read',
        )
        return row ? rowToPlace(row) : null
      } catch (error) {
        if (isRepositoryError(error, 'not_found')) return null // e.g. an id that is not a UUID
        throw error
      }
    },

    async create(input) {
      await ensureSession()
      const row = unwrap<PlaceRow>(
        await places().insert(placeToInsertRow(input)).select().single(),
        'write',
      )
      return rowToPlace(row)
    },

    async update(id, patch) {
      await ensureSession()
      const changes = placePatchToRow(patch)
      const query =
        Object.keys(changes).length > 0
          ? places().update(changes).eq('id', id).select().maybeSingle()
          : places().select('*').eq('id', id).maybeSingle()
      const row = unwrap<PlaceRow | null>(await query, 'write')
      if (!row) throw new RepositoryError('not_found', `Place "${id}" does not exist`)
      return rowToPlace(row)
    },

    async remove(id) {
      await ensureSession()
      // Foreign keys use ON DELETE RESTRICT, so a place still used by an entry or a wishlist item
      // fails with 23503, which becomes the "conflict" error.
      await ignoreNotFound(async () => {
        unwrap(await places().delete().eq('id', id), 'delete')
      })
    },
  }
}
