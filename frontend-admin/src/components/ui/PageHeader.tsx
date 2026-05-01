import { type ReactNode } from 'react'

/**
 * Canonical page header for themed pages.
 *
 * Props:
 *   - emoji: single-character identifier shown in a soft bubble (primary-school icon language)
 *   - title, subtitle: copy
 *   - actions: right-side slot (buttons, filters…)
 *
 * Usage:
 *   <PageHeader emoji="🎒" title="Élèves" subtitle="Fiche rapide, 1 minute" actions={…}/>
 */
export function PageHeader({
  emoji,
  title,
  subtitle,
  actions,
}: {
  emoji?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
      <div className="flex items-center gap-3">
        {emoji ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-school ring-2 ring-school-line">
            {emoji}
          </span>
        ) : null}
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight text-school-ink sm:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-2xl text-sm font-medium text-school-inkmuted">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
