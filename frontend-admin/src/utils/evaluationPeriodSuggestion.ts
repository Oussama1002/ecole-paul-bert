import type { AcademicTerm } from '../api/academicTerms'
import type { EvaluationPeriod } from '../api/evaluationPeriods'

export type EvalPeriodSuggestion = {
  name: string
  code: string
  start_date: string
  end_date: string
  sort_order: number
  term_id: number | null
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

function extractEvalNumber(name: string, code?: string): number | null {
  for (const s of [name, code ?? '']) {
    const fromName = s.match(/(?:é|e)?valuation\s*(\d+)/i)
    if (fromName) return parseInt(fromName[1], 10)
    const fromCode = s.match(/^EP(\d+)/i)
    if (fromCode) return parseInt(fromCode[1], 10)
  }
  return null
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function suggestNextEvaluationPeriod(
  existingPeriods: EvaluationPeriod[],
  terms: AcademicTerm[],
  schoolYear: { start_date: string; end_date: string }
): EvalPeriodSuggestion {
  const used = new Set<number>()
  for (const p of existingPeriods) {
    const n = extractEvalNumber(p.name, p.code)
    if (n) used.add(n)
  }

  let next = 1
  while (used.has(next)) next++

  const maxSort = existingPeriods.reduce((m, p) => Math.max(m, p.sort_order), 0)
  const matchingTerm =
    terms.find((t) => extractTrimestreNumber(t.name, t.code) === next) ?? null

  if (matchingTerm) {
    const start_date = matchingTerm.start_date.slice(0, 10)
    const termEnd = matchingTerm.end_date.slice(0, 10)
    const suggestedEnd = addDays(start_date, 4)
    return {
      name: `Évaluation ${next}`,
      code: `EP${next}-PB`,
      start_date,
      end_date: suggestedEnd > termEnd ? termEnd : suggestedEnd,
      sort_order: maxSort + 1,
      term_id: matchingTerm.id,
    }
  }

  const prevPeriod = existingPeriods.find(
    (p) => extractEvalNumber(p.name, p.code) === next - 1
  )

  const syStart = schoolYear.start_date.slice(0, 10)
  const syEnd = schoolYear.end_date.slice(0, 10)

  let start_date: string
  if (prevPeriod && next > 1) {
    start_date = addDays(prevPeriod.end_date, 1)
  } else {
    start_date = syStart
  }

  const suggestedEnd = addDays(start_date, 4)
  const end_date = suggestedEnd > syEnd ? syEnd : suggestedEnd

  return {
    name: `Évaluation ${next}`,
    code: `EP${next}-PB`,
    start_date,
    end_date,
    sort_order: maxSort + 1,
    term_id: null,
  }
}
