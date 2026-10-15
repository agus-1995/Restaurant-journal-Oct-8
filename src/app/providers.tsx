import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { createQueryClient } from '@/lib/queryClient'

interface AppProvidersProps {
  children: ReactNode
  /** Tests pass their own client for isolation. */
  client?: QueryClient
}

export function AppProviders({ children, client }: AppProvidersProps) {
  const [queryClient] = useState(() => client ?? createQueryClient())
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
