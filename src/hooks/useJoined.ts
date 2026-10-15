import { useMemo } from 'react'
import { joinEntriesWithPlaces, joinWishlistWithPlaces } from '@/lib/join'
import { useEntries, useEntry } from './useEntries'
import { usePlaces } from './usePlaces'
import { useWishlist } from './useWishlist'

/** Entries with their place resolved: the shape the journal and search screens render. */
export function useEntriesWithPlaces() {
  const entries = useEntries()
  const places = usePlaces()
  const data = useMemo(
    () =>
      entries.data && places.data ? joinEntriesWithPlaces(entries.data, places.data) : undefined,
    [entries.data, places.data],
  )
  return {
    data,
    isPending: entries.isPending || places.isPending,
    isError: entries.isError || places.isError,
    error: entries.error ?? places.error,
    refetch: () => Promise.all([entries.refetch(), places.refetch()]),
  }
}

/** One entry with its place. `data` is `null` when the entry does not exist. */
export function useEntryWithPlace(id: string | undefined) {
  const entry = useEntry(id)
  const places = usePlaces()
  const data = useMemo(() => {
    if (entry.data === undefined || places.data === undefined) return undefined
    if (entry.data === null) return null
    return joinEntriesWithPlaces([entry.data], places.data)[0] ?? null
  }, [entry.data, places.data])
  return {
    data,
    isPending: entry.isPending || places.isPending,
    isError: entry.isError || places.isError,
    error: entry.error ?? places.error,
    refetch: () => Promise.all([entry.refetch(), places.refetch()]),
  }
}

export function useWishlistWithPlaces() {
  const wishlist = useWishlist()
  const places = usePlaces()
  const data = useMemo(
    () =>
      wishlist.data && places.data ? joinWishlistWithPlaces(wishlist.data, places.data) : undefined,
    [wishlist.data, places.data],
  )
  return {
    data,
    isPending: wishlist.isPending || places.isPending,
    isError: wishlist.isError || places.isError,
    error: wishlist.error ?? places.error,
    refetch: () => Promise.all([wishlist.refetch(), places.refetch()]),
  }
}
