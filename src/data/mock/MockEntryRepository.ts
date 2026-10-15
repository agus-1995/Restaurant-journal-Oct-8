import { newId } from '@/lib/id'
import type { Entry } from '@/types'
import { RepositoryError, type EntryRepository } from '../repositories'
import type { MockContext } from './context'
import { assertPlaceExists } from './MockPlaceRepository'
import { readCollection, writeCollection } from './storage'
import { assertValidEntryFields } from './validation'

function newestFirst(a: Entry, b: Entry): number {
  return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
}

export function createMockEntryRepository(ctx: MockContext): EntryRepository {
  return {
    list: () => ctx.request(() => readCollection<Entry>(ctx, 'entries').sort(newestFirst)),

    getById: (id) =>
      ctx.request(() => readCollection<Entry>(ctx, 'entries').find((e) => e.id === id) ?? null),

    create: (input) =>
      ctx.request(() => {
        assertValidEntryFields(input)
        assertPlaceExists(ctx, input.placeId)
        const timestamp = ctx.now().toISOString()
        const entry: Entry = {
          id: newId(),
          placeId: input.placeId,
          date: input.date,
          reaction: input.reaction,
          photos: input.photos ?? [],
          dishes: input.dishes ?? [],
          priceTier: input.priceTier,
          isUnusual: input.isUnusual ?? false,
          occasion: input.occasion,
          cuisineTags: input.cuisineTags ?? [],
          notes: input.notes,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        writeCollection(ctx, 'entries', [...readCollection<Entry>(ctx, 'entries'), entry])
        return entry
      }),

    update: (id, patch) =>
      ctx.request(() => {
        const entries = readCollection<Entry>(ctx, 'entries')
        const index = entries.findIndex((e) => e.id === id)
        const existing = entries[index]
        if (!existing) throw new RepositoryError('not_found', `Entry "${id}" does not exist`)
        assertValidEntryFields(patch)
        if (patch.placeId !== undefined) assertPlaceExists(ctx, patch.placeId)
        const updated: Entry = { ...existing, ...patch, updatedAt: ctx.now().toISOString() }
        entries[index] = updated
        writeCollection(ctx, 'entries', entries)
        return updated
      }),

    remove: (id) =>
      ctx.request(() => {
        const entries = readCollection<Entry>(ctx, 'entries')
        writeCollection(
          ctx,
          'entries',
          entries.filter((e) => e.id !== id),
        )
      }),
  }
}
