import { isRepositoryError, type RepositoryErrorCode } from '@/data/repositories'

export type RepositoryMessageKey = `errors.repository.${RepositoryErrorCode | 'unknown'}`

/** Maps any thrown value to a translation key, so screens never show raw error text. */
export function errorMessageKey(error: unknown): RepositoryMessageKey {
  return isRepositoryError(error) ? `errors.repository.${error.code}` : 'errors.repository.unknown'
}
