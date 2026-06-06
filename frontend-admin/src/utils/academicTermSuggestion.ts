import type { AcademicTerm } from '../api/academicTerms'

export type TermSuggestion = {
  name: string
  code: string
  start_date: string
  end_date: string
  sort_order: number
}

function trimestreLabel(n: number): string {
  if (n === 1) return '1er trimestre'
  return `${n}ème trimestre`
}

function extractTrimestreNumber(name: string, code?: string): number | null {
  for (const s of [name, code ?? '']) {
    const fromName = s.match(/(\d+)\s*(?:er|ère|ème|eme)?\s*trimestre/i)
    if (fromName) return parseInt(fromName[1], 10)
    const fromCode = s.match(/^T(\d+)/i)
    if (fromCode) return parseInt(fromCode[1], 10)
  }
  return null
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start.slice(0, 10)}T12:00:00`).getTime()
  const b = new Date(`${end.slice(0, 10)}T12:00:00`).getTime()
  return Math.round((b - a) / 86400000)
}

export function suggestNextAcademicTerm(
  existingTerms: AcademicTerm[],
  schoolYear: { start_date: string; end_date: string }
): TermSuggestion {
  const used = new Set<number>()
  for (const t of existingTerms) {
    const n = extractTrimestreNumber(t.name, t.code)
    if (n) used.add(n)
  }

  let next = 1
  while (used.has(next)) next++

  const maxSort = existingTerms.reduce((m, t) => Math.max(m, t.sort_order), 0)
  const prevTerm = existingTerms.find(
    (t) => extractTrimestreNumber(t.name, t.code) === next - 1
  )

  const syStart = schoolYear.start_date.slice(0, 10)
  const syEnd = schoolYear.end_date.slice(0, 10)
  const partDays = Math.max(1, Math.floor(daysBetween(syStart, syEnd) / 3))

  let start_date: string
  if (prevTerm && next > 1) {
    start_date = addDays(prevTerm.end_date, 1)
  } else {
    start_date = syStart
  }

  let end_date: string
  if (next >= 3) {
    end_date = syEnd
  } else {
    end_date = addDays(syStart, next * partDays - 1)
    if (end_date < start_date) end_date = addDays(start_date, partDays - 1)
    if (end_date > syEnd) end_date = syEnd
  }

  return {
    name: trimestreLabel(next),
    code: `T${next}-PB`,
    start_date,
    end_date,
    sort_order: maxSort + 1,
  }
}
