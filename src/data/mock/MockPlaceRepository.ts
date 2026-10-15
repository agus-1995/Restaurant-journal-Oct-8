import { newId } from '@/lib/id'
import type { Entry, Place, WishlistItem } from '@/types'
import { RepositoryError, type PlaceRepository } from '../repositories'
import type { MockContext } from './context'
import { readCollection, writeCollection } from './storage'
import { assertNonEmpty } from './validation'

export function assertPlaceExists(ctx: MockContext, placeId: string): void {
  const exists = readCollection<Place>(ctx, 'places').some((place) => place.id === placeId)
  if (!exists) throw new RepositoryError('not_found', `Place "${placeId}" does not exist`)
}

export function createMockPlaceRepository(ctx: MockContext): PlaceRepository {
  return {
    list: () =>
      ctx.request(() =>
        readCollection<Place>(ctx, 'places').sort((a, b) => a.name.localeCompare(b.name, 'es')),
      ),

    getById: (id) =>
      ctx.request(() => readCollection<Place>(ctx, 'places').find((p) => p.id === id) ?? null),

    create: (input) =>
      ctx.request(() => {
        assertNonEmpty(input.name, 'Place name')
        assertNonEmpty(input.city, 'City')
        const place: Place = {
          ...input,
          id: newId(),
          name: input.name.trim(),
          city: input.city.trim(),
          type: input.type ?? 'restaurant',
          status: input.status ?? 'open',
          createdAt: ctx.now().toISOString(),
        }
        writeCollection(ctx, 'places', [...readCollection<Place>(ctx, 'places'), place])
        return place
      }),

    update: (id, patch) =>
      ctx.request(() => {
        const places = readCollection<Place>(ctx, 'places')
        const index = places.findIndex((p) => p.id === id)
        const existing = places[index]
        if (!existing) throw new RepositoryError('not_found', `Place "${id}" does not exist`)
        if (patch.name !== undefined) assertNonEmpty(patch.name, 'Place name')
        if (patch.city !== undefined) assertNonEmpty(patch.city, 'City')
        const updated: Place = { ...existing, ...patch }
        places[index] = updated
        writeCollection(ctx, 'places', places)
        return updated
      }),

    remove: (id) =>
      ctx.request(() => {
        const usedByEntry = readCollection<Entry>(ctx, 'entries').some((e) => e.placeId === id)
        const usedByWishlist = readCollection<WishlistItem>(ctx, 'wishlist').some(
          (w) => w.placeId === id,
        )
        if (usedByEntry || usedByWishlist) {
          throw new RepositoryError('conflict', `Place "${id}" is still referenced`)
        }
        const places = readCollection<Place>(ctx, 'places')
        writeCollection(
          ctx,
          'places',
          places.filter((p) => p.id !== id),
        )
      }),
  }
}
