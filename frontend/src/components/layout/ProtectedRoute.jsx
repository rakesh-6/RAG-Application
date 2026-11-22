import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Icon from '../ui/Icon'
import SlowServerHint from '../ui/SlowServerHint'

export function FullPageSpinner() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-slate-600">
      <p role="status" className="flex items-center gap-3">
        <Icon name="spinner" className="size-6 text-indigo-600" />
        Loading…
      </p>
      <SlowServerHint active />
    </div>
  )
}

/** Only logged-in users get through; others go to /login and come back here afterwards. */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Login and register pages: a logged-in user is sent straight to the app. */
export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <FullPageSpinner />
  if (isAuthenticated) return <Navigate to="/chat" replace />
  return <Outlet />
}
