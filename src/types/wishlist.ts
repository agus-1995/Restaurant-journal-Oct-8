import type { EntityId, ISODateTime } from './common'

export interface WishlistItem {
  id: EntityId
  placeId: EntityId
  note?: string
  /** Who or what recommended it, e.g. "Cami" or "Instagram". */
  source?: string
  addedAt: ISODateTime
}

export type CreateWishlistItemInput = Pick<WishlistItem, 'placeId'> &
  Partial<Pick<WishlistItem, 'note' | 'source'>>

export type UpdateWishlistItemInput = Partial<Pick<WishlistItem, 'note' | 'source'>>
