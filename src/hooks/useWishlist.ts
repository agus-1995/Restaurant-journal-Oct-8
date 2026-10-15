import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRepositories } from '@/data/RepositoryContext'
import type { CreateWishlistItemInput, WishlistItem } from '@/types'
import { queryKeys } from './queryKeys'

export function useWishlist() {
  const { wishlist } = useRepositories()
  return useQuery({ queryKey: queryKeys.wishlist.list(), queryFn: () => wishlist.list() })
}

export function useAddWishlistItem() {
  const { wishlist } = useRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateWishlistItemInput) => wishlist.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all }),
  })
}

/** Optimistic: the item disappears immediately and comes back if the request fails. */
export function useRemoveWishlistItem() {
  const { wishlist } = useRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => wishlist.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wishlist.all })
      const previous = queryClient.getQueryData<WishlistItem[]>(queryKeys.wishlist.list())
      queryClient.setQueryData<WishlistItem[]>(queryKeys.wishlist.list(), (list) =>
        list?.filter((item) => item.id !== id),
      )
      return { previous }
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(queryKeys.wishlist.list(), context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all }),
  })
}
