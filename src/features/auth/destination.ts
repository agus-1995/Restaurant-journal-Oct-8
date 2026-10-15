interface RedirectState {
  from?: { pathname: string; search: string }
}

/** Where to go after signing in: back to where the user was headed, or the journal. */
export function destinationAfterLogin(state: unknown): string {
  const from = (state as RedirectState | null)?.from
  if (!from || typeof from.pathname !== 'string' || !from.pathname.startsWith('/')) return '/'
  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password']
  if (authPages.includes(from.pathname)) return '/'
  return `${from.pathname}${from.search ?? ''}`
}
