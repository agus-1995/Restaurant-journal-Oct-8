export type RepositoryErrorCode =
  | 'not_found'
  | 'conflict'
  | 'invalid'
  | 'quota_exceeded'
  | 'unavailable'
  | 'unauthorized'
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'email_taken'
  | 'weak_password'
  | 'rate_limited'

/**
 * The only error type repositories throw on purpose. UI code maps `code` to a translated
 * message, so any implementation (mock or Supabase) must use the same codes.
 */
export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode

  constructor(code: RepositoryErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'RepositoryError'
    this.code = code
  }
}

export function isRepositoryError(
  error: unknown,
  code?: RepositoryErrorCode,
): error is RepositoryError {
  return error instanceof RepositoryError && (code === undefined || error.code === code)
}
