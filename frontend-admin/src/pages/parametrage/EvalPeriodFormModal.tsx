import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import type { AcademicTerm } from '../../api/academicTerms'
import * as evaluationPeriodsApi from '../../api/evaluationPeriods'
import type { EvaluationPeriod } from '../../api/evaluationPeriods'
import type { SchoolYear } from '../../api/schoolYears'
import { suggestNextEvaluationPeriod } from '../../utils/evaluationPeriodSuggestion'
import { getApiErrorMessage } from '../../utils/apiError'

function autoEvalCode(name: string): string {
  const match = name.match(/\d+/)
  return match ? `EP${match[0]}-PB` : ''
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function EvalPeriodFormModal({
  schoolYearId,
  schoolYear,
  existingPeriods,
  period,
  terms,
  onClose,
}: {
  schoolYearId: number
  schoolYear: SchoolYear | null
  existingPeriods: EvaluationPeriod[]
  period: EvaluationPeriod | null
  terms: AcademicTerm[]
  onClose: () => void
}) {
  const isNew = period === null
  const queryClient = useQueryClient()

  const suggestion =
    isNew && schoolYear
      ? suggestNextEvaluationPeriod(existingPeriods, terms, schoolYear)
      : null

  const [termId, setTermId] = useState<number | ''>(
    period?.term_id ?? suggestion?.term_id ?? ''
  )
  const [name, setName] = useState(period?.name ?? suggestion?.name ?? '')
  const [code, setCode] = useState(period?.code ?? suggestion?.code ?? '')
  const [codeManual, setCodeManual] = useState(!isNew)
  const [start, setStart] = useState(
    period?.start_date?.slice(0, 10) ?? suggestion?.start_date ?? ''
  )
  const [end, setEnd] = useState(
    period?.end_date?.slice(0, 10) ?? suggestion?.end_date ?? ''
  )
  const [order, setOrder] = useState(period?.sort_order ?? suggestion?.sort_order ?? 1)
  const [closed, setClosed] = useState(period?.is_closed ?? false)
  const [error, setError] = useState<string | null>(null)

  function onNameChange(v: string) {
    setName(v)
    if (!codeManual) setCode(autoEvalCode(v))
  }

  function onStartChange(v: string) {
    setStart(v)
    if (v) setEnd(addDays(v, 4))
  }

  const save = useMutation({
    mutationFn: async () => {
      if (isNew) {
        return evaluationPeriodsApi.createEvaluationPeriod({
          school_year_id: schoolYearId,
          term_id: termId === '' ? null : termId,
          name,
          code,
          start_date: start,
          end_date: end,
          is_closed: closed,
        })
      }
      return evaluationPeriodsApi.updateEvaluationPeriod(period!.id, {
        term_id: termId === '' ? null : (termId as number),
        name,
        code,
        start_date: start,
        end_date: end,
        sort_order: order,
        is_closed: closed,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-periods'] })
      onClose()
    },
    onError: (e: unknown) => setError(getApiErrorMessage(e, 'Enregistrement impossible.')),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-school-border/70 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-school-line bg-white px-6 py-4">
          <h3 className="font-display text-lg font-bold text-school-ink">
            {isNew ? "Nouvelle période d'évaluation" : "Modifier la période d'évaluation"}
          </h3>
          <button type="button" onClick={onClose} className="text-xl leading-none text-school-inkmuted hover:text-school-ink">✕</button>
        </div>

        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); setError(null); save.mutate() }}
          className="space-y-4 p-6"
        >
          {error && (
            <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">{error}</p>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Trimestre (optionnel)</span>
            <select value={termId === '' ? '' : termId} onChange={(e) => setTermId(e.target.value === '' ? '' : Number(e.target.value))} className="school-select">
              <option value="">— Aucun trimestre —</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Nom *</span>
              <input required placeholder="Ex : Évaluation 1" value={name} onChange={(e) => onNameChange(e.target.value)} className="school-input" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Code *</span>
              <input required placeholder="Ex : EP1-PB" value={code} onChange={(e) => { setCodeManual(true); setCode(e.target.value) }} className="school-input" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Date de début *</span>
              <input type="date" required value={start} onChange={(e) => onStartChange(e.target.value)} className="school-input" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Date de fin *</span>
              <input type="date" required value={end} onChange={(e) => setEnd(e.target.value)} className="school-input" />
            </label>
            {!isNew && (
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Ordre d'affichage</span>
                <input type="number" min={0} value={order} onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)} className="school-input" />
              </label>
            )}
            <label className={`flex items-center gap-2 text-sm ${!isNew ? 'pt-6' : 'sm:col-span-2'}`}>
              <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} className="h-4 w-4" />
              <span className="text-school-ink">Fermée</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="school-btn-secondary">Annuler</button>
            <button type="submit" disabled={save.isPending} className="school-btn-primary disabled:opacity-60">
              {save.isPending ? 'Enregistrement…' : isNew ? 'Ajouter la période' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
