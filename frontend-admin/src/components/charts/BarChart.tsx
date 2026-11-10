import { useState } from 'react'
import { useChartWidth } from './useChartWidth'

export type BarDatum = { label: string; value: number; color?: string }

type Props = {
  data: BarDatum[]
  horizontal?: boolean
  height?: number
  formatValue?: (v: number) => string
  defaultColor?: string
}

const DEFAULT_COLOR = '#2563EB'

export function BarChart({
  data,
  horizontal = false,
  height = 240,
  formatValue = (v) => String(v),
  defaultColor = DEFAULT_COLOR,
}: Props) {
  const { ref, width } = useChartWidth()
  const [hover, setHover] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div ref={ref} className="flex items-center justify-center text-sm text-school-inkmuted" style={{ height }}>
        Aucune donnée
      </div>
    )
  }

  const max = Math.max(...data.map((d) => d.value), 1)

  // ── Horizontal bars ──────────────────────────────────────────────────────
  if (horizontal) {
    return (
      <div ref={ref} className="w-full space-y-2.5">
        {data.map((d, i) => (
          <div key={d.label + i} className="flex items-center gap-3">
            <div className="w-28 shrink-0 truncate text-right text-xs font-semibold text-school-ink" title={d.label}>
              {d.label}
            </div>
            <div className="relative h-6 flex-1 overflow-hidden rounded-lg bg-school-mist/40">
              <div
                className="flex h-full items-center justify-end rounded-lg px-2 text-[11px] font-bold text-white transition-all"
                style={{
                  width: `${Math.max(2, (d.value / max) * 100)}%`,
                  backgroundColor: d.color ?? defaultColor,
                }}
              >
                <span className="drop-shadow-sm">{formatValue(d.value)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Vertical bars ────────────────────────────────────────────────────────
  const padding = { top: 16, right: 8, bottom: 30, left: 8 }
  const innerW = Math.max(1, width - padding.left - padding.right)
  const innerH = Math.max(1, height - padding.top - padding.bottom)
  const slot = innerW / data.length
  const barW = Math.min(48, slot * 0.6)

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height}>
        {data.map((d, i) => {
          const h = (d.value / max) * innerH
          const x = padding.left + slot * i + (slot - barW) / 2
          const y = padding.top + innerH - h
          return (
            <g
              key={d.label + i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(1, h)}
                rx={6}
                fill={d.color ?? defaultColor}
                opacity={hover === null || hover === i ? 1 : 0.55}
              />
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" className="fill-school-ink" style={{ fontSize: 10, fontWeight: 700 }}>
                {formatValue(d.value)}
              </text>
              <text x={x + barW / 2} y={height - 10} textAnchor="middle" className="fill-school-inkmuted" style={{ fontSize: 10 }}>
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
