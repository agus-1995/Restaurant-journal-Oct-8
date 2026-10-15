import type {
  CreateWishlistItemInput,
  EntityId,
  UpdateWishlistItemInput,
  WishlistItem,
} from '@/types'

export interface WishlistRepository {
  /** All items, most recently added first. */
  list(): Promise<WishlistItem[]>
  getById(id: EntityId): Promise<WishlistItem | null>
  /** Throws `not_found` if `placeId` does not exist. */
  create(input: CreateWishlistItemInput): Promise<WishlistItem>
  /** Throws `not_found` if the item does not exist. */
  update(id: EntityId, patch: UpdateWishlistItemInput): Promise<WishlistItem>
  /** Idempotent: removing a missing item succeeds. */
  remove(id: EntityId): Promise<void>
}
