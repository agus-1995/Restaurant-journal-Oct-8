import type { CreatePlaceInput, EntityId, Place, UpdatePlaceInput } from '@/types'

export interface PlaceRepository {
  /** All places, alphabetical by name. */
  list(): Promise<Place[]>
  getById(id: EntityId): Promise<Place | null>
  create(input: CreatePlaceInput): Promise<Place>
  /** Throws `not_found` if the place does not exist. */
  update(id: EntityId, patch: UpdatePlaceInput): Promise<Place>
  /** Throws `conflict` while any entry or wishlist item still references the place. */
  remove(id: EntityId): Promise<void>
}
