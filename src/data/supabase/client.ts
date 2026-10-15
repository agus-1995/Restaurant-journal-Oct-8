import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface Env {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

/**
 * A `service_role` / secret key bypasses row-level security. In a browser it would hand every
 * visitor full access to everyone's data, so refuse to start with one.
 */
export function looksLikeSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  const payload = key.split('.')[1]
  if (!payload) return false
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const claims: unknown = JSON.parse(json)
    return (
      typeof claims === 'object' &&
      claims !== null &&
      'role' in claims &&
      claims.role === 'service_role'
    )
  } catch {
    return false
  }
}

/**
 * Builds the Supabase client from env vars, or returns `null` when they are not set (the app then
 * runs on local mock data).
 */
export function createSupabaseClientFromEnv(env: Env = import.meta.env): SupabaseClient | null {
  const url = env.VITE_SUPABASE_URL?.trim()
  const key = env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) {
    if (url && !key) {
      console.warn(
        '[Mi Diario] VITE_SUPABASE_URL is set but VITE_SUPABASE_ANON_KEY is empty: using local data.',
      )
    }
    return null
  }
  if (looksLikeSecretKey(key)) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY is a secret/service_role key. Use the anon (publishable) key: ' +
        'secret keys must never be shipped to a browser.',
    )
  }
  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mi-diario:supabase-auth' },
  })
}
