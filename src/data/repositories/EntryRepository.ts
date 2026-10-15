import type { CreateEntryInput, Entry, EntityId, UpdateEntryInput } from '@/types'

export interface EntryRepository {
  /** All entries, newest first (by `date`, then `createdAt`). */
  list(): Promise<Entry[]>
  /** Resolves `null` when the entry does not exist. */
  getById(id: EntityId): Promise<Entry | null>
  /** Throws `not_found` if `placeId` does not exist, `invalid` for bad field values. */
  create(input: CreateEntryInput): Promise<Entry>
  /** Throws `not_found` if the entry does not exist. */
  update(id: EntityId, patch: UpdateEntryInput): Promise<Entry>
  /** Idempotent: removing a missing entry succeeds. */
  remove(id: EntityId): Promise<void>
}
