import { useState } from 'react'
import { useChartWidth } from './useChartWidth'

export type LinePoint = { label: string; value: number }
export type LineSeries = { name: string; color: string; data: LinePoint[] }

type Props = {
  /** Single-series data. Ignored when `series` is provided. */
  data?: LinePoint[]
  /** Multi-series data (e.g. invoiced vs collected). */
  series?: LineSeries[]
  color?: string
  height?: number
  showDots?: boolean
  showLabels?: boolean
  formatValue?: (v: number) => string
}

const DEFAULT_COLOR = '#2563EB'

/** Smooth path through points using a Catmull-Rom → cubic-bezier conversion. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

export function LineChart({
  data,
  series,
  color = DEFAULT_COLOR,
  height = 240,
  showDots = true,
  showLabels = true,
  formatValue = (v) => String(v),
}: Props) {
  const { ref, width } = useChartWidth()
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const allSeries: LineSeries[] = series ?? [
    { name: 'série', color, data: data ?? [] },
  ]
  const labels = allSeries[0]?.data.map((d) => d.label) ?? []
  const n = labels.length

  const padding = { top: 16, right: 16, bottom: showLabels ? 30 : 12, left: 52 }
  const innerW = Math.max(1, width - padding.left - padding.right)
  const innerH = Math.max(1, height - padding.top - padding.bottom)

  const values = allSeries.flatMap((s) => s.data.map((d) => d.value))
  const rawMax = values.length ? Math.max(...values) : 0
  const rawMin = values.length ? Math.min(...values, 0) : 0
  const max = rawMax === rawMin ? rawMax + 1 : rawMax
  const min = rawMin
  const span = max - min || 1

  const xAt = (i: number) =>
    padding.left + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1))
  const yAt = (v: number) => padding.top + innerH - ((v - min) / span) * innerH

  const gridY = Array.from({ length: 5 }, (_, i) => min + (span * i) / 4)

  if (n === 0) {
    return (
      <div ref={ref} className="flex items-center justify-center text-sm text-school-inkmuted" style={{ height }}>
        Aucune donnée
      </div>
    )
  }

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" className="overflow-visible">
        {/* gridlines + y labels */}
        {gridY.map((gv, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yAt(gv)}
              y2={yAt(gv)}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={yAt(gv) + 4}
              textAnchor="end"
              className="fill-school-inkmuted"
              style={{ fontSize: 10 }}
            >
              {formatValue(gv)}
            </text>
          </g>
        ))}

        {/* x labels */}
        {showLabels &&
          labels.map((lb, i) => (
            <text
              key={lb + i}
              x={xAt(i)}
              y={height - 8}
              textAnchor="middle"
              className="fill-school-inkmuted"
              style={{ fontSize: 10 }}
            >
              {lb}
            </text>
          ))}

        {/* series */}
        {allSeries.map((s) => {
          const pts = s.data.map((d, i) => ({ x: xAt(i), y: yAt(d.value) }))
          return (
            <g key={s.name}>
              <path d={smoothPath(pts)} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" />
              {showDots &&
                pts.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill="#fff"
                    stroke={s.color}
                    strokeWidth={2}
                    onMouseEnter={() =>
                      setHover({
                        x: p.x,
                        y: p.y,
                        text: `${s.data[i].label} · ${s.name !== 'série' ? s.name + ' : ' : ''}${formatValue(s.data[i].value)}`,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
            </g>
          )
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-school-ink px-2 py-1 text-xs font-semibold text-white shadow-lg"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          {hover.text}
        </div>
      )}
    </div>
  )
}
