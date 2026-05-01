/**
 * Small progress / ratio bar used in dashboards (presence rate, finance gauge…).
 *
 * Pass `value` and `max`; the fill width is clamped between 0–100%. The tone
 * controls the gradient. Optional `label` and `caption` slots render above
 * and below the bar so it can be used as a self-contained widget.
 */
type Tone = 'sky' | 'leaf' | 'sun' | 'coral' | 'grape' | 'mango'

const TONE_GRADIENT: Record<Tone, string> = {
  sky: 'bg-gradient-to-r from-school-sky to-school-skydeep',
  leaf: 'bg-gradient-to-r from-school-mint to-school-leafdeep',
  sun: 'bg-gradient-to-r from-school-sun to-school-mango',
  coral: 'bg-gradient-to-r from-school-coral to-school-cherry',
  grape: 'bg-gradient-to-r from-school-bubblegum to-school-grape',
  mango: 'bg-gradient-to-r from-school-mango to-school-coral',
}

export function StatBar({
  value,
  max,
  tone = 'grape',
  label,
  caption,
}: {
  value: number
  max: number
  tone?: Tone
  label?: React.ReactNode
  caption?: React.ReactNode
}) {
  const safeMax = Math.max(max, 1)
  const pct = Math.max(0, Math.min(100, Math.round((value / safeMax) * 100)))

  return (
    <div className="space-y-1">
      {label ? (
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-school-inkmuted">
          {label}
        </div>
      ) : null}
      <div
        className="school-stat-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={value}
      >
        <div
          className={`school-stat-bar-fill ${TONE_GRADIENT[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {caption ? (
        <div className="text-[11px] font-medium text-school-inkmuted">
          {caption}
        </div>
      ) : null}
    </div>
  )
}
