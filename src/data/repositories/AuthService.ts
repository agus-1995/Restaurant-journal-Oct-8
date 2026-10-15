export interface AuthUser {
  id: string
  email: string
}

export type AuthEvent = 'signed_in' | 'signed_out' | 'password_recovery'

/** Signing up either logs you straight in, or (when the project requires it) asks you to confirm your email. */
export type SignUpOutcome = 'signed_in' | 'confirm_email'

export interface AuthService {
  /**
   * False for the local mock: there is nobody to sign in as, so the app is always "signed in" and
   * the login screens are skipped. True for a real back end.
   */
  readonly required: boolean
  /** The user to treat as signed in from the very first render, when no sign-in is needed (mock). */
  readonly localUser?: AuthUser
  /** The current user, or `null` when signed out. */
  getUser(): Promise<AuthUser | null>
  /** Notifies on sign in / out / password recovery. Returns an unsubscribe function. */
  onChange(listener: (event: AuthEvent, user: AuthUser | null) => void): () => void
  /** Throws `email_taken`, `weak_password`, `rate_limited`, `invalid`, `unavailable`. */
  signUp(email: string, password: string): Promise<SignUpOutcome>
  /** Throws `invalid_credentials`, `email_not_confirmed`, `rate_limited`, `unavailable`. */
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  /** Always resolves the same way whether or not the email has an account (no account enumeration). */
  requestPasswordReset(email: string): Promise<void>
  /** For a signed-in user (including one arriving from a reset link). Throws `weak_password`. */
  updatePassword(password: string): Promise<void>
}
