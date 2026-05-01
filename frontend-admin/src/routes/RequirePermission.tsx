import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RequirePermission({
  permission,
  children,
}: {
  permission: string
  children: ReactNode
}) {
  const { hasPermission, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Chargement…
      </div>
    )
  }

  if (!hasPermission(permission)) {
    return (
      <Navigate to="/acces-refuse" replace state={{ from: location, permission }} />
    )
  }

  return <>{children}</>
}

export function RequireAnyPermission({
  permissions,
  children,
}: {
  permissions: string[]
  children: ReactNode
}) {
  const { hasPermission, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Chargement…
      </div>
    )
  }

  if (!permissions.some((p) => hasPermission(p))) {
    return (
      <Navigate
        to="/acces-refuse"
        replace
        state={{ from: location, permission: permissions.join('|') }}
      />
    )
  }

  return <>{children}</>
}
