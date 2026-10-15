import type { SupabaseClient } from '@supabase/supabase-js'
import { isRepositoryError, RepositoryError, type WishlistRepository } from '../repositories'
import { ignoreNotFound, unwrap } from './errors'
import {
  rowToWishlistItem,
  wishlistPatchToRow,
  wishlistToInsertRow,
  type WishlistRow,
} from './mappers'

export function createSupabaseWishlistRepository(
  client: SupabaseClient,
  ensureSession: () => Promise<string>,
): WishlistRepository {
  const items = () => client.from('wishlist_items')

  return {
    async list() {
      await ensureSession()
      const rows = unwrap<WishlistRow[]>(
        await items().select('*').order('added_at', { ascending: false }),
        'read',
      )
      return rows.map(rowToWishlistItem)
    },

    async getById(id) {
      await ensureSession()
      try {
        const row = unwrap<WishlistRow | null>(
          await items().select('*').eq('id', id).maybeSingle(),
          'read',
        )
        return row ? rowToWishlistItem(row) : null
      } catch (error) {
        if (isRepositoryError(error, 'not_found')) return null
        throw error
      }
    },

    async create(input) {
      await ensureSession()
      const row = unwrap<WishlistRow>(
        await items().insert(wishlistToInsertRow(input)).select().single(),
        'write',
      )
      return rowToWishlistItem(row)
    },

    async update(id, patch) {
      await ensureSession()
      const changes = wishlistPatchToRow(patch)
      const query =
        Object.keys(changes).length > 0
          ? items().update(changes).eq('id', id).select().maybeSingle()
          : items().select('*').eq('id', id).maybeSingle()
      const row = unwrap<WishlistRow | null>(await query, 'write')
      if (!row) throw new RepositoryError('not_found', `Wishlist item "${id}" does not exist`)
      return rowToWishlistItem(row)
    },

    async remove(id) {
      await ensureSession()
      await ignoreNotFound(async () => {
        unwrap(await items().delete().eq('id', id), 'delete')
      })
    },
  }
}
