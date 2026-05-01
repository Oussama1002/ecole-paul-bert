/**
 * Localized date helpers for header/hero greetings.
 *
 * Returns a French weekday + day + month (e.g. "Mardi 28 avril").
 */
export function formatSchoolDate(date: Date = new Date()): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/**
 * Time-aware greeting in French ("Bonjour", "Bon après-midi", "Bonsoir").
 */
export function getGreeting(date: Date = new Date()): string {
  const h = date.getHours()
  if (h < 5) return 'Bonsoir'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

/**
 * A small pill that shows today's date in French — designed to sit on
 * dark hero backgrounds (white-on-color).
 */
export function TodayPill({
  className = '',
  date = new Date(),
}: {
  className?: string
  date?: Date
}) {
  const text = formatSchoolDate(date)
  return (
    <span
      className={`school-chip-on-dark capitalize ${className}`}
      title="Date du jour"
    >
      <span aria-hidden>📅</span>
      {text}
    </span>
  )
}
