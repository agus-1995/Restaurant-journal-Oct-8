import { newId } from '@/lib/id'
import type { WishlistItem } from '@/types'
import { RepositoryError, type WishlistRepository } from '../repositories'
import type { MockContext } from './context'
import { assertPlaceExists } from './MockPlaceRepository'
import { readCollection, writeCollection } from './storage'

export function createMockWishlistRepository(ctx: MockContext): WishlistRepository {
  return {
    list: () =>
      ctx.request(() =>
        readCollection<WishlistItem>(ctx, 'wishlist').sort((a, b) =>
          b.addedAt.localeCompare(a.addedAt),
        ),
      ),

    getById: (id) =>
      ctx.request(
        () => readCollection<WishlistItem>(ctx, 'wishlist').find((w) => w.id === id) ?? null,
      ),

    create: (input) =>
      ctx.request(() => {
        assertPlaceExists(ctx, input.placeId)
        const item: WishlistItem = {
          id: newId(),
          placeId: input.placeId,
          note: input.note,
          source: input.source,
          addedAt: ctx.now().toISOString(),
        }
        writeCollection(ctx, 'wishlist', [...readCollection<WishlistItem>(ctx, 'wishlist'), item])
        return item
      }),

    update: (id, patch) =>
      ctx.request(() => {
        const items = readCollection<WishlistItem>(ctx, 'wishlist')
        const index = items.findIndex((w) => w.id === id)
        const existing = items[index]
        if (!existing)
          throw new RepositoryError('not_found', `Wishlist item "${id}" does not exist`)
        const updated: WishlistItem = { ...existing, ...patch }
        items[index] = updated
        writeCollection(ctx, 'wishlist', items)
        return updated
      }),

    remove: (id) =>
      ctx.request(() => {
        const items = readCollection<WishlistItem>(ctx, 'wishlist')
        writeCollection(
          ctx,
          'wishlist',
          items.filter((w) => w.id !== id),
        )
      }),
  }
}
