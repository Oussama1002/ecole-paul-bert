type Props = {
  label: string
  value: string
  /** Sparkline series (chronological). */
  spark: number[]
  color?: string
  /** Signed percentage trend; omit to hide the badge. */
  trend?: number
  invert?: boolean
  emoji?: string
}

const DEFAULT_COLOR = '#2563EB'

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 96
  const h = 28
  if (values.length < 2) {
    return <svg width={w} height={h} />
  }
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = (w * i) / (values.length - 1)
    const y = h - ((v - min) / span) * (h - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={w}
        cy={h - ((values[values.length - 1] - min) / span) * (h - 4) - 2}
        r={2.5}
        fill={color}
      />
    </svg>
  )
}

export function StatCard({ label, value, spark, color = DEFAULT_COLOR, trend, invert = false, emoji }: Props) {
  const flat = trend === undefined || Math.abs(trend) < 0.05
  const positive = invert ? (trend ?? 0) < 0 : (trend ?? 0) > 0
  const tone = flat
    ? 'text-school-inkmuted'
    : positive
      ? 'text-school-leafdeep'
      : 'text-[#B23A2E]'

  return (
    <div className="school-tile">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-school-inkmuted">{label}</p>
        {emoji ? <span className="text-lg" aria-hidden>{emoji}</span> : null}
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="font-display text-2xl font-bold text-school-ink">{value}</p>
        <Sparkline values={spark} color={color} />
      </div>
      {trend !== undefined && (
        <p className={`mt-1 text-xs font-bold ${tone}`}>
          {flat ? '─ stable' : `${trend > 0 ? '▲' : '▼'} ${Math.abs(trend).toFixed(1)}%`}
        </p>
      )}
    </div>
  )
}
