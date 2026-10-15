import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { createRepositories } from '@/data/createRepositories'
import { RepositoryProvider } from '@/data/RepositoryProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { AppProviders } from './providers'
import { routes } from './routes'

const router = createBrowserRouter(routes)
const repositories = createRepositories()

export function App() {
  return (
    <RepositoryProvider repositories={repositories}>
      <AppProviders>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </AppProviders>
    </RepositoryProvider>
  )
}
