import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/LoadingState'
import { useAuth } from './AuthContext'
import { destinationAfterLogin } from './destination'

/** Everything inside needs a signed-in user; others are sent to the login screen. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-md p-6">
        <LoadingState variant="detail" />
      </div>
    )
  }
  if (status === 'signed_out') {
    const from = { pathname: location.pathname, search: location.search }
    return <Navigate to="/login" replace state={{ from }} />
  }
  return <Outlet />
}

/** Login / sign-up / "forgot password" are pointless when already signed in. */
export function RedirectIfSignedIn() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <LoadingState variant="detail" />
  if (status === 'signed_in') return <Navigate to={destinationAfterLogin(location.state)} replace />
  return <Outlet />
}
