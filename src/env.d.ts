/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. When unset (with the key), the app uses the local mock data. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon / publishable key. Safe to ship in the browser: row-level security protects data. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
