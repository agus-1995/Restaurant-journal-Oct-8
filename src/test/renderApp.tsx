import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { routes } from '@/app/routes'
import { RepositoryProvider } from '@/data/RepositoryProvider'
import type { MemoryStorage } from '@/data/mock'
import type { AuthService } from '@/data/repositories'
import { createTestRepositories } from './testRepositories'

interface RenderAppOptions {
  /** Swap in a real-looking auth service (the default mock needs no sign-in). */
  auth?: AuthService
  /** Runs before the first render, e.g. to set the `seed=empty` or `fail` dev switches. */
  prepare?: (storage: MemoryStorage) => void
}

/** Renders the real route tree in memory, starting at `path`, on isolated test repositories. */
export function renderApp(path = '/', { prepare, auth }: RenderAppOptions = {}) {
  const { repositories: base, storage } = createTestRepositories()
  const repositories = auth ? { ...base, auth } : base
  prepare?.(storage)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  // No retries or caching, so failures surface immediately and tests stay independent.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const utils = render(
    <RepositoryProvider repositories={repositories}>
      <AppProviders client={client}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </AppProviders>
    </RepositoryProvider>,
  )
  return { ...utils, repositories, storage, router }
}
