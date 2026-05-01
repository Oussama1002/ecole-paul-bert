import type { MonthlyEvolutionItem } from '../../api/finance'

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

export function MonthlyEvolutionChart({ items }: { items: MonthlyEvolutionItem[] }) {
  const W = 720
  const H = 280
  const padL = 50
  const padR = 16
  const padT = 16
  const padB = 40
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const maxVal = Math.max(
    1,
    ...items.flatMap((i) => [i.revenue, i.expenses])
  )
  const groupW = innerW / items.length
  const barW = (groupW - 6) / 2

  const yTick = (v: number) => padT + innerH - (v / maxVal) * innerH

  const ticks = 4
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => (maxVal * i) / ticks)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-full" role="img" aria-label="Évolution mensuelle">
        {tickValues.map((v) => (
          <g key={v}>
            <line
              x1={padL}
              x2={W - padR}
              y1={yTick(v)}
              y2={yTick(v)}
              stroke="#e5e7eb"
              strokeDasharray="2 2"
            />
            <text x={padL - 6} y={yTick(v) + 3} fontSize="10" fill="#64748b" textAnchor="end">
              {Math.round(v).toLocaleString('fr-FR')}
            </text>
          </g>
        ))}

        {items.map((it, i) => {
          const x0 = padL + i * groupW + 3
          const hRev = (it.revenue / maxVal) * innerH
          const hExp = (it.expenses / maxVal) * innerH
          return (
            <g key={it.period}>
              <rect
                x={x0}
                y={padT + innerH - hRev}
                width={barW}
                height={hRev}
                fill="#10b981"
                rx="2"
              >
                <title>{`${MONTHS_FR[it.month - 1]} — Revenus : ${it.revenue.toLocaleString('fr-FR')}`}</title>
              </rect>
              <rect
                x={x0 + barW + 2}
                y={padT + innerH - hExp}
                width={barW}
                height={hExp}
                fill="#ef4444"
                rx="2"
              >
                <title>{`${MONTHS_FR[it.month - 1]} — Dépenses : ${it.expenses.toLocaleString('fr-FR')}`}</title>
              </rect>
              <text
                x={padL + i * groupW + groupW / 2}
                y={H - padB + 16}
                fontSize="10"
                fill="#475569"
                textAnchor="middle"
              >
                {MONTHS_FR[it.month - 1]}
              </text>
            </g>
          )
        })}

        <g transform={`translate(${padL}, ${H - 12})`}>
          <rect width="10" height="10" fill="#10b981" rx="2" />
          <text x="14" y="9" fontSize="10" fill="#475569">Revenus</text>
          <rect x="80" width="10" height="10" fill="#ef4444" rx="2" />
          <text x="94" y="9" fontSize="10" fill="#475569">Dépenses</text>
        </g>
      </svg>
    </div>
  )
}
