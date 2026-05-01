import { type ReactNode } from 'react'
import { getApiErrorMessage } from '../../utils/apiError'

export function ErrorState({
  error,
  title = 'Une erreur est survenue',
  fallback = 'Impossible de charger ces informations pour le moment.',
  onRetry,
  action,
}: {
  error?: unknown
  title?: string
  fallback?: string
  onRetry?: () => void
  action?: ReactNode
}) {
  const message = getApiErrorMessage(error, fallback)

  return (
    <div className="school-empty border-school-coral/35 bg-school-coral/10">
      <span className="school-empty-emoji bg-school-coral/20 text-[#B23A2E]" aria-hidden>
        ⚠️
      </span>
      <p className="school-empty-title text-[#8E2E24]">{title}</p>
      <p className="school-empty-hint leading-relaxed text-[#8E2E24]/85">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="school-btn-secondary mt-1">
          Réessayer
        </button>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
