import { RepositoryError, type AuthService, type AuthUser } from '../repositories'

export const LOCAL_USER: AuthUser = { id: 'local-user', email: 'local@mi-diario' }

/**
 * The local mock has a single, always-signed-in user, so there are no login screens in this mode
 * (`required: false`). The write methods are never reachable from the UI.
 */
export function createMockAuthService(): AuthService {
  const unsupported = () =>
    Promise.reject(new RepositoryError('unavailable', 'Accounts are not available with local data'))
  return {
    required: false,
    localUser: LOCAL_USER,
    getUser: () => Promise.resolve(LOCAL_USER),
    onChange: () => () => undefined,
    signUp: unsupported,
    signIn: unsupported,
    signOut: unsupported,
    requestPasswordReset: unsupported,
    updatePassword: unsupported,
  }
}
