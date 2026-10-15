import { createContext, useContext } from 'react'
import type { AuthUser, SignUpOutcome } from '@/data/repositories'

export interface AuthContextValue {
  /** `loading` only while an existing session is being looked up on startup. */
  status: 'loading' | 'signed_in' | 'signed_out'
  user: AuthUser | null
  /** True when the user arrived from a password-reset email link. */
  recovery: boolean
  /** False with local mock data: there are no accounts, everyone is "signed in". */
  required: boolean
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<SignUpOutcome>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
