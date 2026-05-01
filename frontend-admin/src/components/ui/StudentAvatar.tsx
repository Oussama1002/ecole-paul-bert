/**
 * Colored initials bubble used in student/teacher lists.
 *
 * The color is stable per person (hashed from the identifier or name) so the
 * same student always renders with the same accent across pages.
 */

const PALETTE = [
  'bg-school-bubblegum',
  'bg-school-grape',
  'bg-school-skydeep',
  'bg-school-leafdeep',
  'bg-school-mango',
  'bg-school-coral',
  'bg-school-mint',
  'bg-school-lilac',
  'bg-school-cherry',
]

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function initialsOf(first?: string | null, last?: string | null): string {
  const a = (first ?? '').trim().charAt(0)
  const b = (last ?? '').trim().charAt(0)
  const out = (a + b).toUpperCase()
  return out || '•'
}

export function StudentAvatar({
  firstName,
  lastName,
  seed,
  size = 'md',
}: {
  firstName?: string | null
  lastName?: string | null
  /** Stable identifier for coloring; falls back to name. */
  seed?: string | number
  size?: 'sm' | 'md' | 'lg'
}) {
  const key = String(seed ?? `${lastName ?? ''}-${firstName ?? ''}`)
  const color = PALETTE[hash(key) % PALETTE.length]
  const sizing =
    size === 'sm'
      ? 'h-8 w-8 text-[11px]'
      : size === 'lg'
        ? 'h-12 w-12 text-sm'
        : 'h-9 w-9 text-xs'

  return (
    <span
      className={`school-initials ring-2 ring-white/80 ${color} ${sizing}`}
      aria-hidden
    >
      {initialsOf(firstName, lastName)}
    </span>
  )
}
