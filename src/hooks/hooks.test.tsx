import { act, renderHook, waitFor } from '@testing-library/react'
import { isRepositoryError } from '@/data/repositories'
import { createHookWrapper } from '@/test/hookWrapper'
import { createTestRepositories, STORAGE_KEYS } from '@/test/testRepositories'
import {
  useCreateEntry,
  useDeleteEntry,
  useEntries,
  useEntriesWithPlaces,
  useEntry,
  useEntryWithPlace,
  useRemoveWishlistItem,
  useWishlistWithPlaces,
} from '.'

function setup() {
  const { repositories, storage } = createTestRepositories()
  return { storage, wrapper: createHookWrapper(repositories) }
}

describe('data hooks', () => {
  it('useEntries goes from pending to the seeded entries', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useEntries(), { wrapper })
    expect(result.current.isPending).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(14)
  })

  it('useEntriesWithPlaces resolves each entry’s place', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useEntriesWithPlaces(), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data).toHaveLength(14)
    expect(result.current.data?.[0]?.place.name).toBe('Bodegón Don Anselmo')
  })

  it('useEntryWithPlace returns the entry+place, or null for an unknown id', async () => {
    const { wrapper } = setup()
    const found = renderHook(() => useEntryWithPlace('entry-03'), { wrapper })
    await waitFor(() => expect(found.result.current.data).toBeDefined())
    expect(found.result.current.data?.place.name).toBe('Kimchi y Provoleta')

    const missing = renderHook(() => useEntryWithPlace('nope'), { wrapper })
    await waitFor(() => expect(missing.result.current.data).toBeNull())
  })

  it('useEntry stays idle until it has an id', () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useEntry(undefined), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('useCreateEntry adds the entry and refreshes the list', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => ({ list: useEntries(), create: useCreateEntry() }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.list.data).toHaveLength(14))
    await act(() =>
      result.current.create.mutateAsync({
        placeId: 'place-cafe',
        date: '2026-10-07',
        reaction: 'loved',
      }),
    )
    await waitFor(() => expect(result.current.list.data).toHaveLength(15))
    expect(result.current.list.data?.[0]?.date).toBe('2026-10-07')
  })

  it('useDeleteEntry removes the entry from the list', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => ({ list: useEntries(), del: useDeleteEntry() }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.list.data).toHaveLength(14))
    await act(() => result.current.del.mutateAsync('entry-01'))
    await waitFor(() => expect(result.current.list.data).toHaveLength(13))
    expect(result.current.list.data?.some((e) => e.id === 'entry-01')).toBe(false)
  })

  it('useDeleteEntry puts the entry back when the request fails', async () => {
    const { wrapper, storage } = setup()
    const { result } = renderHook(() => ({ list: useEntries(), del: useDeleteEntry() }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.list.data).toHaveLength(14))
    storage.setItem(STORAGE_KEYS.failFlag, '1')
    await act(async () => {
      await result.current.del.mutateAsync('entry-01').catch(() => undefined)
    })
    await waitFor(() => expect(result.current.del.isError).toBe(true))
    expect(isRepositoryError(result.current.del.error, 'unavailable')).toBe(true)
    // The failure flag is still on, so the follow-up refetch also fails: the only thing that can
    // bring entry-01 back into the cache here is the optimistic-update rollback.
    expect(result.current.list.data).toHaveLength(14)
    expect(result.current.list.data?.some((e) => e.id === 'entry-01')).toBe(true)
  })

  it('exposes request failures as an error state (and recovers on refetch)', async () => {
    const { wrapper, storage } = setup()
    storage.setItem(STORAGE_KEYS.failFlag, '1')
    const { result } = renderHook(() => useEntriesWithPlaces(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(isRepositoryError(result.current.error, 'unavailable')).toBe(true)
    storage.removeItem(STORAGE_KEYS.failFlag)
    await act(() => result.current.refetch())
    await waitFor(() => expect(result.current.data).toHaveLength(14))
  })

  it('useRemoveWishlistItem drops the item from the wishlist', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(
      () => ({ list: useWishlistWithPlaces(), remove: useRemoveWishlistItem() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.list.data).toHaveLength(3))
    await act(() => result.current.remove.mutateAsync('wish-01'))
    await waitFor(() => expect(result.current.list.data).toHaveLength(2))
  })
})
