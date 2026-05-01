import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSimpleMode } from '../contexts/SimpleModeContext'

/**
 * Route guard for pages that only make sense in advanced mode.
 *
 * Simple mode hides these routes from the sidebar, but a user could still
 * land on them via a bookmark, a back button or a direct URL. This guard
 * redirects them back home and keeps the UX coherent with the mode choice.
 *
 * IMPORTANT: this does NOT enforce security — backend permissions still
 * do. This is purely a UX simplification layer.
 */
export function RequireAdvancedMode({ children }: { children: ReactNode }) {
  const { simpleMode, ready } = useSimpleMode()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-school-inkmuted">
        Chargement…
      </div>
    )
  }

  if (simpleMode) {
    return <Navigate to="/" replace state={{ from: location, reason: 'simple_mode' }} />
  }

  return <>{children}</>
}
