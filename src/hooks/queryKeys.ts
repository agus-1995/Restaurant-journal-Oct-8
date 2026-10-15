/** One place for cache keys, so invalidation can never drift from the queries. */
export const queryKeys = {
  entries: {
    all: ['entries'] as const,
    list: () => ['entries', 'list'] as const,
    detail: (id: string) => ['entries', 'detail', id] as const,
  },
  places: {
    all: ['places'] as const,
    list: () => ['places', 'list'] as const,
  },
  wishlist: {
    all: ['wishlist'] as const,
    list: () => ['wishlist', 'list'] as const,
  },
  preferences: ['preferences'] as const,
}
