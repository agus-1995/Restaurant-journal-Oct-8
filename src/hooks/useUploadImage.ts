import { useMutation } from '@tanstack/react-query'
import { useRepositories } from '@/data/RepositoryContext'

/** Resolves the string to put in `Entry.photos`. */
export function useUploadImage() {
  const { images } = useRepositories()
  return useMutation({ mutationFn: (file: Blob) => images.upload(file) })
}
