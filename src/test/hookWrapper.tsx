import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { RepositoryProvider } from '@/data/RepositoryProvider'
import type { Repositories } from '@/data/repositories'

/** Wrapper for `renderHook`: real provider + a query client that never retries or caches. */
export function createHookWrapper(repositories: Repositories) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <RepositoryProvider repositories={repositories}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </RepositoryProvider>
    )
  }
}
