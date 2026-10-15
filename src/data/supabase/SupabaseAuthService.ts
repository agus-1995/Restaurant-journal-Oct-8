import type { AuthError, Session, SupabaseClient } from '@supabase/supabase-js'
import {
  RepositoryError,
  type AuthEvent,
  type AuthService,
  type AuthUser,
  type RepositoryErrorCode,
} from '../repositories'

/** Maps the codes GoTrue (Supabase Auth) returns to the app's error codes. */
export function toAuthError(
  error: Pick<AuthError, 'message' | 'code' | 'status'>,
): RepositoryError {
  const options = { cause: error }
  const byCode: Record<string, RepositoryErrorCode> = {
    invalid_credentials: 'invalid_credentials',
    email_not_confirmed: 'email_not_confirmed',
    user_already_exists: 'email_taken',
    email_exists: 'email_taken',
    weak_password: 'weak_password',
    same_password: 'weak_password',
    over_request_rate_limit: 'rate_limited',
    over_email_send_rate_limit: 'rate_limited',
    over_sms_send_rate_limit: 'rate_limited',
    validation_failed: 'invalid',
    email_address_invalid: 'invalid',
    bad_json: 'invalid',
    session_not_found: 'unauthorized',
    session_expired: 'unauthorized',
    refresh_token_not_found: 'unauthorized',
    signup_disabled: 'unavailable',
  }
  const code =
    (error.code && byCode[error.code]) || (error.status === 429 ? 'rate_limited' : undefined)
  return new RepositoryError(code ?? 'unavailable', error.message, options)
}

function toUser(session: Session | null): AuthUser | null {
  const user = session?.user
  return user ? { id: user.id, email: user.email ?? '' } : null
}

/** Email + password accounts on Supabase Auth. */
export function createSupabaseAuthService(
  client: SupabaseClient,
  origin: () => string = () => window.location.origin,
): AuthService {
  return {
    required: true,

    async getUser() {
      const { data, error } = await client.auth.getSession()
      if (error) throw toAuthError(error)
      return toUser(data.session)
    },

    onChange(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        const mapped: Record<string, AuthEvent | undefined> = {
          SIGNED_IN: 'signed_in',
          SIGNED_OUT: 'signed_out',
          PASSWORD_RECOVERY: 'password_recovery',
        }
        const authEvent = mapped[event]
        if (authEvent) listener(authEvent, toUser(session))
      })
      return () => data.subscription.unsubscribe()
    },

    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        // Where the confirmation link lands (must be allowed in Auth → URL Configuration).
        options: { emailRedirectTo: `${origin()}/login` },
      })
      if (error) throw toAuthError(error)
      return data.session ? 'signed_in' : 'confirm_email'
    },

    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw toAuthError(error)
    },

    async signOut() {
      const { error } = await client.auth.signOut()
      if (error) throw toAuthError(error)
    },

    async requestPasswordReset(email) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin()}/reset-password`,
      })
      // "User not found" is never surfaced, so the screen can't be used to discover who has an account.
      if (error && toAuthError(error).code !== 'invalid') throw toAuthError(error)
    },

    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password })
      if (error) throw toAuthError(error)
    },
  }
}
