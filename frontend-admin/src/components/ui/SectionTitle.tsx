import { type ReactNode } from 'react'

/**
 * Consistent in-page section heading.
 *
 * Usage:
 *   <SectionTitle emoji="📈" title="Recettes — 6 derniers mois" actions={...} />
 */
export function SectionTitle({
  emoji,
  title,
  hint,
  iconClassName = 'bg-school-grape/10',
  actions,
}: {
  emoji?: string
  title: string
  hint?: string
  /** Tailwind class applied to the emoji bubble (color tone). */
  iconClassName?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {emoji ? (
          <span className={`school-section-title-icon ${iconClassName}`} aria-hidden>
            {emoji}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="school-section-title">{title}</h3>
          {hint ? (
            <p className="text-xs font-medium text-school-inkmuted">{hint}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
