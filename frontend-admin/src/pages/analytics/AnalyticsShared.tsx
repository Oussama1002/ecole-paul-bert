import { type ReactNode } from 'react'

/** Notice shown when only one school year exists (no trend yet). */
export function SingleYearNotice() {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-school-sun/40 bg-school-sun/10 px-4 py-3">
      <span className="text-xl" aria-hidden>
        📅
      </span>
      <p className="text-sm font-medium text-school-ink">
        Les analyses pluriannuelles seront disponibles à partir de la deuxième année scolaire.
        En attendant, les données de l’année en cours sont affichées comme référence de départ.
      </p>
    </div>
  )
}

/** Simple skeleton block for loading states. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-school-mist/50 ${className}`} />
}

export function ChartCard({
  title,
  emoji,
  children,
  action,
}: {
  title: string
  emoji?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="school-section">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-base font-bold text-school-ink">
          {emoji ? <span aria-hidden>{emoji}</span> : null}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Small colored legend row for multi-series charts. */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-xs font-semibold text-school-inkmuted">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}
