import { RepositoryError } from '../repositories'

/** The slice of PostgREST / Storage / Auth errors we look at. */
export interface DbError {
  code?: string
  message: string
  status?: number
  statusCode?: string | number
}

/** What the failing operation was doing: the same DB error can mean different things. */
export type ErrorContext = 'read' | 'write' | 'delete'

const INVALID_CODES = new Set([
  '23502', // not_null_violation
  '23514', // check_violation (bad enum value, price tier 4, blank name…)
  '22007', // invalid_datetime_format
  '22008', // datetime_field_overflow (e.g. 2026-02-31)
  '22001', // string_data_right_truncation
  '22003', // numeric_value_out_of_range
  '22023', // invalid_parameter_value
])

/**
 * Translates a Supabase error into the app's `RepositoryError`, so screens show the same friendly
 * messages whether data comes from the mock or from Postgres.
 */
export function toRepositoryError(error: DbError, context: ErrorContext): RepositoryError {
  const options = { cause: error }
  const message = error.message
  const status = Number(error.status ?? error.statusCode ?? 0)

  switch (error.code) {
    case 'PGRST116': // "exactly one row expected" and there was none
    case '22P02': // invalid input syntax (e.g. an id that is not a UUID): it cannot exist
      return new RepositoryError('not_found', message, options)
    case '23503': // foreign key: deleting a place still in use, or pointing at a missing one
      return new RepositoryError(context === 'delete' ? 'conflict' : 'not_found', message, options)
    case '23505':
      return new RepositoryError('conflict', message, options)
    case 'PGRST301': // JWT expired / invalid
    case 'PGRST302': // anonymous access disabled
      return new RepositoryError('unauthorized', message, options)
    case '42501':
      // RLS rejects writes pointing at a place the user does not own, including one that does
      // not exist at all (the policy runs before the foreign-key check).
      if (context === 'write' && /row-level security/i.test(message)) {
        return new RepositoryError('not_found', message, options)
      }
      return new RepositoryError('unauthorized', message, options)
    default:
      break
  }
  if (error.code && INVALID_CODES.has(error.code)) {
    return new RepositoryError('invalid', message, options)
  }
  if (status === 401 || status === 403) return new RepositoryError('unauthorized', message, options)
  // Network failures, 5xx, anything unknown: the user can simply try again.
  return new RepositoryError('unavailable', message, options)
}

/** Storage uses its own error shape (no SQL codes). */
export function toStorageError(error: DbError): RepositoryError {
  const options = { cause: error }
  const status = Number(error.status ?? error.statusCode ?? 0)
  if (status === 413 || /exceed|too large|payload/i.test(error.message)) {
    return new RepositoryError('quota_exceeded', error.message, options)
  }
  if (
    status === 401 ||
    status === 403 ||
    /row-level security|unauthori[sz]ed/i.test(error.message)
  ) {
    return new RepositoryError('unauthorized', error.message, options)
  }
  if (status === 415 || /mime|not supported/i.test(error.message)) {
    return new RepositoryError('invalid', error.message, options)
  }
  return new RepositoryError('unavailable', error.message, options)
}

/**
 * Returns the data, or throws the translated error. This is the one place we trust the row shape
 * coming back from Postgres (there are no generated DB types), so callers state it as `T`.
 */
export function unwrap<T>(
  result: { data: unknown; error: DbError | null },
  context: ErrorContext,
): T {
  if (result.error) throw toRepositoryError(result.error, context)
  return result.data as T
}

/** `remove` is idempotent: deleting something that is not there (or cannot exist) is fine. */
export async function ignoreNotFound(operation: () => Promise<void>): Promise<void> {
  try {
    await operation()
  } catch (error) {
    if (!(error instanceof RepositoryError && error.code === 'not_found')) throw error
  }
}
