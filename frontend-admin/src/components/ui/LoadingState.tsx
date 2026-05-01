export function LoadingState({
  label = 'Chargement…',
  lines = 4,
}: {
  label?: string
  lines?: number
}) {
  return (
    <div className="school-section space-y-3" aria-busy="true" aria-live="polite">
      <p className="text-sm font-semibold text-school-inkmuted">{label}</p>
      {Array.from({ length: Math.max(1, lines) }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-2xl border-2 border-school-line bg-white/70"
        />
      ))}
    </div>
  )
}
