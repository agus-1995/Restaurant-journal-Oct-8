import type { Entry, EntryWithPlace, Place, WishlistItem, WishlistItemWithPlace } from '@/types'

function indexById(places: readonly Place[]): Map<string, Place> {
  return new Map(places.map((place) => [place.id, place]))
}

/** Resolves each entry's place. Entries whose place is missing are dropped (they cannot render). */
export function joinEntriesWithPlaces(
  entries: readonly Entry[],
  places: readonly Place[],
): EntryWithPlace[] {
  const byId = indexById(places)
  return entries.flatMap((entry) => {
    const place = byId.get(entry.placeId)
    return place ? [{ ...entry, place }] : []
  })
}

export function joinWishlistWithPlaces(
  items: readonly WishlistItem[],
  places: readonly Place[],
): WishlistItemWithPlace[] {
  const byId = indexById(places)
  return items.flatMap((item) => {
    const place = byId.get(item.placeId)
    return place ? [{ ...item, place }] : []
  })
}
