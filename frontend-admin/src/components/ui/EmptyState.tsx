import { type ReactNode } from 'react'

/**
 * Friendly empty state with a soft emoji bubble + helper text + optional CTA.
 *
 * Designed for in-page "rien à afficher" moments (empty list, no class
 * selected, etc.). Uses the warm school palette so it never feels stark.
 */
export function EmptyState({
  emoji = '✨',
  title,
  hint,
  action,
}: {
  emoji?: string
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="school-empty">
      <span className="school-empty-emoji" aria-hidden>
        {emoji}
      </span>
      <p className="school-empty-title">{title}</p>
      {hint ? <p className="school-empty-hint leading-relaxed">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
