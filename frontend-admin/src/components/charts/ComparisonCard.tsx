type Props = {
  title: string
  currentValue: string
  previousValue: string
  /** Signed percentage change vs previous year. */
  trend: number
  /** Optional unit suffix for the trend badge (defaults to %). */
  unit?: string
  /** When true a downward trend is good (e.g. student/teacher ratio, absences). */
  invert?: boolean
  emoji?: string
}

export function ComparisonCard({
  title,
  currentValue,
  previousValue,
  trend,
  unit = '%',
  invert = false,
  emoji,
}: Props) {
  const flat = Math.abs(trend) < 0.05
  const positive = invert ? trend < 0 : trend > 0
  const tone = flat
    ? 'bg-school-mist/50 text-school-inkmuted'
    : positive
      ? 'bg-school-leaf/15 text-school-leafdeep'
      : 'bg-school-coral/15 text-[#B23A2E]'
  const arrow = flat ? '─' : trend > 0 ? '▲' : '▼'

  return (
    <div className="school-tile">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-school-inkmuted">{title}</p>
        {emoji ? <span className="text-lg" aria-hidden>{emoji}</span> : null}
      </div>
      <p className="mt-1.5 font-display text-2xl font-bold text-school-ink">{currentValue}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>
          {arrow} {flat ? '—' : `${Math.abs(trend).toFixed(1)}${unit}`}
        </span>
        <span className="text-xs font-medium text-school-inkmuted">vs {previousValue}</span>
      </div>
    </div>
  )
}
