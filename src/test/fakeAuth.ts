import {
  RepositoryError,
  type AuthEvent,
  type AuthService,
  type AuthUser,
  type RepositoryErrorCode,
} from '@/data/repositories'

interface FakeUser extends AuthUser {
  password: string
  confirmed: boolean
}

export interface FakeAuth extends AuthService {
  /** Emails a reset link was requested for. */
  resetRequests: string[]
  /** Make the next call (of any kind) fail with this code. */
  failNextWith(code: RepositoryErrorCode): void
  /** Pretend the user clicked the link in a password-reset email. */
  openRecoveryLink(email: string): void
  currentUser(): AuthUser | null
  passwordOf(email: string): string | undefined
}

interface Options {
  signedInAs?: string
  /** Sign-up leaves the account unconfirmed (like a project with email confirmation on). */
  requireConfirmation?: boolean
  users?: { email: string; password: string; confirmed?: boolean }[]
}

/** An in-memory stand-in for Supabase Auth, so the account screens can be tested end to end. */
export function createFakeAuth({
  signedInAs,
  requireConfirmation = false,
  users = [],
}: Options = {}): FakeAuth {
  const accounts = new Map<string, FakeUser>()
  let counter = 0
  const add = (email: string, password: string, confirmed: boolean) => {
    const user: FakeUser = { id: `user-${(counter += 1)}`, email, password, confirmed }
    accounts.set(email.toLowerCase(), user)
    return user
  }
  for (const u of users) add(u.email, u.password, u.confirmed ?? true)
  if (signedInAs && !accounts.has(signedInAs.toLowerCase())) add(signedInAs, 'password123', true)

  let current: FakeUser | null = signedInAs
    ? (accounts.get(signedInAs.toLowerCase()) ?? null)
    : null
  let failure: RepositoryErrorCode | null = null
  const listeners = new Set<(event: AuthEvent, user: AuthUser | null) => void>()

  const publicUser = (user: FakeUser | null): AuthUser | null =>
    user ? { id: user.id, email: user.email } : null
  const emit = (event: AuthEvent) =>
    listeners.forEach((listener) => listener(event, publicUser(current)))
  const guard = () => {
    if (failure) {
      const code = failure
      failure = null
      throw new RepositoryError(code, `fake ${code}`)
    }
  }

  return {
    required: true,
    resetRequests: [],
    failNextWith: (code) => {
      failure = code
    },
    currentUser: () => publicUser(current),
    passwordOf: (email) => accounts.get(email.toLowerCase())?.password,
    openRecoveryLink(email) {
      current = accounts.get(email.toLowerCase()) ?? null
      emit('password_recovery')
    },

    getUser: () => Promise.resolve(publicUser(current)),
    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    signUp(email, password) {
      guard()
      if (accounts.has(email.toLowerCase())) {
        return Promise.reject(new RepositoryError('email_taken', 'exists'))
      }
      if (password.length < 6) return Promise.reject(new RepositoryError('weak_password', 'weak'))
      const user = add(email, password, !requireConfirmation)
      if (requireConfirmation) return Promise.resolve('confirm_email')
      current = user
      emit('signed_in')
      return Promise.resolve('signed_in')
    },

    signIn(email, password) {
      guard()
      const user = accounts.get(email.toLowerCase())
      if (!user || user.password !== password) {
        return Promise.reject(new RepositoryError('invalid_credentials', 'bad credentials'))
      }
      if (!user.confirmed)
        return Promise.reject(new RepositoryError('email_not_confirmed', 'unconfirmed'))
      current = user
      emit('signed_in')
      return Promise.resolve()
    },

    signOut() {
      guard()
      current = null
      emit('signed_out')
      return Promise.resolve()
    },

    requestPasswordReset(email) {
      guard()
      this.resetRequests.push(email)
      return Promise.resolve()
    },

    updatePassword(password) {
      guard()
      if (!current) return Promise.reject(new RepositoryError('unauthorized', 'not signed in'))
      if (password.length < 6) return Promise.reject(new RepositoryError('weak_password', 'weak'))
      current.password = password
      return Promise.resolve()
    },
  }
}
