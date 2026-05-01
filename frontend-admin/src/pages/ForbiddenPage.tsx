import { Link, useLocation } from 'react-router-dom'

export function ForbiddenPage() {
  const location = useLocation()
  const permission = (location.state as { permission?: string } | null)?.permission

  return (
    <div className="school-page-bg flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md rounded-school-lg border-2 border-amber-200/80 bg-school-paper p-10 text-center shadow-school-lg">
        <div className="mb-4 text-5xl" aria-hidden>
          🛝
        </div>
        <h1 className="mb-2 font-display text-2xl font-extrabold text-school-ink">
          Oups — accès refusé
        </h1>
        <p className="mb-6 text-sm font-medium leading-relaxed text-school-inkmuted">
          Vous n&apos;avez pas les droits nécessaires pour afficher cette page
          {permission ? (
            <>
              {' '}
              <span className="font-mono text-xs text-school-ink">
                ({permission})
              </span>
            </>
          ) : null}
          .
        </p>
        <Link to="/" className="school-btn-primary inline-block">
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
