import type { Entry, Place, UserPreferences } from '@/types'

/**
 * Smart default for the city of a brand-new place: the last city used, else the city where the
 * user has logged the most entries, else blank.
 */
export function defaultCity(
  places: readonly Place[],
  entries: readonly Entry[],
  preferences: Pick<UserPreferences, 'lastCity'> | undefined,
): string {
  if (preferences?.lastCity) return preferences.lastCity
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const city = places.find((place) => place.id === entry.placeId)?.city
    if (city) counts.set(city, (counts.get(city) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}
