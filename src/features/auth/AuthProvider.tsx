import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRepositories } from '@/data/RepositoryContext'
import type { AuthUser } from '@/data/repositories'
import { AuthContext, type AuthContextValue } from './AuthContext'

interface State {
  status: AuthContextValue['status']
  user: AuthUser | null
  recovery: boolean
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = useRepositories()
  const queryClient = useQueryClient()

  const [state, setState] = useState<State>(() =>
    auth.required
      ? { status: 'loading', user: null, recovery: false }
      : { status: 'signed_in', user: auth.localUser ?? null, recovery: false },
  )
  const userId = useRef<string | null>(state.user?.id ?? null)

  useEffect(() => {
    if (!auth.required) return

    /** A different person is now signed in (or nobody): drop everything cached for the last one. */
    function apply(next: State) {
      const nextId = next.user?.id ?? null
      if (nextId !== userId.current) {
        userId.current = nextId
        queryClient.clear()
      }
      setState(next)
    }

    let active = true
    // The startup lookup can finish AFTER a newer event (e.g. the user opened a reset link). The
    // event is fresher, so once one has arrived the lookup's answer is ignored.
    let eventSeen = false
    auth
      .getUser()
      .then((user) => {
        if (active && !eventSeen) {
          apply({ status: user ? 'signed_in' : 'signed_out', user, recovery: false })
        }
      })
      .catch(() => {
        if (active && !eventSeen) apply({ status: 'signed_out', user: null, recovery: false })
      })

    const unsubscribe = auth.onChange((event, user) => {
      if (!active) return
      eventSeen = true
      if (event === 'signed_out') apply({ status: 'signed_out', user: null, recovery: false })
      else if (event === 'password_recovery') apply({ status: 'signed_in', user, recovery: true })
      else apply({ status: 'signed_in', user, recovery: false })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [auth, queryClient])

  const value = useMemo<AuthContextValue>(() => {
    /** Reads the fresh user right after an action so the UI doesn't wait for the change event. */
    async function refresh() {
      const user = await auth.getUser()
      if (user?.id !== userId.current) {
        userId.current = user?.id ?? null
        queryClient.clear()
      }
      setState({ status: user ? 'signed_in' : 'signed_out', user, recovery: false })
    }
    return {
      ...state,
      required: auth.required,
      async signIn(email, password) {
        await auth.signIn(email, password)
        await refresh()
      },
      async signUp(email, password) {
        const outcome = await auth.signUp(email, password)
        if (outcome === 'signed_in') await refresh()
        return outcome
      },
      async signOut() {
        await auth.signOut()
        await refresh()
      },
      requestPasswordReset: (email) => auth.requestPasswordReset(email),
      async updatePassword(password) {
        await auth.updatePassword(password)
        setState((current) => ({ ...current, recovery: false }))
      },
    }
  }, [auth, queryClient, state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
