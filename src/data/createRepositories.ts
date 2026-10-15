import type { Repositories } from './repositories'
import { createMockRepositories } from './mock'
import { createSupabaseClientFromEnv, createSupabaseRepositories } from './supabase'

/**
 * THE swap point. With `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set (in `.env.local`) the
 * app talks to Supabase; without them it runs on local mock data, so it always works out of the box.
 */
export function createRepositories(): Repositories {
  const client = createSupabaseClientFromEnv()
  if (client) {
    console.info('[Mi Diario] Data source: Supabase')
    return createSupabaseRepositories(client)
  }
  console.info('[Mi Diario] Data source: local mock data (no Supabase keys configured)')
  return createMockRepositories()
}
