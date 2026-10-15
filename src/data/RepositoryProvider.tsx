import type { ReactNode } from 'react'
import { RepositoryContext } from './RepositoryContext'
import type { Repositories } from './repositories'

interface RepositoryProviderProps {
  repositories: Repositories
  children: ReactNode
}

export function RepositoryProvider({ repositories, children }: RepositoryProviderProps) {
  return <RepositoryContext.Provider value={repositories}>{children}</RepositoryContext.Provider>
}
