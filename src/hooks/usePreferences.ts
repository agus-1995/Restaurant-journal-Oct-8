import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRepositories } from '@/data/RepositoryContext'
import type { UpdatePreferencesInput } from '@/types'
import { queryKeys } from './queryKeys'

export function usePreferences() {
  const { preferences } = useRepositories()
  return useQuery({ queryKey: queryKeys.preferences, queryFn: () => preferences.get() })
}

export function useUpdatePreferences() {
  const { preferences } = useRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: UpdatePreferencesInput) => preferences.update(patch),
    onSuccess: (updated) => queryClient.setQueryData(queryKeys.preferences, updated),
  })
}
