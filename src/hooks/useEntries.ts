import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRepositories } from '@/data/RepositoryContext'
import type { CreateEntryInput, Entry, UpdateEntryInput } from '@/types'
import { queryKeys } from './queryKeys'

export function useEntries() {
  const { entries } = useRepositories()
  return useQuery({ queryKey: queryKeys.entries.list(), queryFn: () => entries.list() })
}

/** Resolves `null` when the entry does not exist (so screens can show a "not found" state). */
export function useEntry(id: string | undefined) {
  const { entries } = useRepositories()
  return useQuery({
    queryKey: queryKeys.entries.detail(id ?? ''),
    queryFn: () => (id === undefined ? null : entries.getById(id)),
    enabled: id !== undefined,
  })
}

export function useCreateEntry() {
  const { entries } = useRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEntryInput) => entries.create(input),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.entries.detail(created.id), created)
      return queryClient.invalidateQueries({ queryKey: queryKeys.entries.list() })
    },
  })
}

export function useUpdateEntry() {
  const { entries } = useRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateEntryInput }) =>
      entries.update(id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.entries.detail(updated.id), updated)
      return queryClient.invalidateQueries({ queryKey: queryKeys.entries.list() })
    },
  })
}

/** Optimistic: the entry disappears immediately and comes back if the request fails. */
export function useDeleteEntry() {
  const { entries } = useRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => entries.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.entries.all })
      const previousList = queryClient.getQueryData<Entry[]>(queryKeys.entries.list())
      queryClient.setQueryData<Entry[]>(queryKeys.entries.list(), (list) =>
        list?.filter((entry) => entry.id !== id),
      )
      return { previousList }
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(queryKeys.entries.list(), context?.previousList)
    },
    // Only forget the detail once the entry is really gone; on failure the screen still needs it.
    onSuccess: (_data, id) => queryClient.removeQueries({ queryKey: queryKeys.entries.detail(id) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.entries.list() }),
  })
}
