import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-school-mist/40 px-4 text-center text-school-ink">
        <span className="text-3xl" aria-hidden>
          ⏳
        </span>
        <p className="text-sm font-semibold">Connexion en cours…</p>
        <p className="max-w-xs text-xs text-school-inkmuted">
          Préparation de votre espace Paul Bert.
        </p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
