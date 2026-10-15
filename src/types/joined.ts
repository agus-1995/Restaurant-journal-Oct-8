import type { Entry } from './entry'
import type { Place } from './place'
import type { WishlistItem } from './wishlist'

/** An entry with its place resolved: what the journal, search and detail screens render. */
export type EntryWithPlace = Entry & { place: Place }

export type WishlistItemWithPlace = WishlistItem & { place: Place }
