import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRepositories } from '@/data/RepositoryContext'
import type { CreatePlaceInput } from '@/types'
import { queryKeys } from './queryKeys'

export function usePlaces() {
  const { places } = useRepositories()
  return useQuery({ queryKey: queryKeys.places.list(), queryFn: () => places.list() })
}

/** Used by quick-log to create a place on the fly. */
export function useCreatePlace() {
  const { places } = useRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePlaceInput) => places.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.places.all }),
  })
}
