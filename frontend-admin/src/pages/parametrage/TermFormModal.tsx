import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import * as academicTermsApi from '../../api/academicTerms'
import type { AcademicTerm } from '../../api/academicTerms'
import type { SchoolYear } from '../../api/schoolYears'
import { suggestNextAcademicTerm } from '../../utils/academicTermSuggestion'
import { getApiErrorMessage } from '../../utils/apiError'

function autoTermCode(name: string): string {
  const match = name.match(/\d+/)
  return match ? `T${match[0]}-PB` : ''
}

export function TermFormModal({
  schoolYearId,
  schoolYear,
  existingTerms,
  term,
  onClose,
}: {
  schoolYearId: number
  schoolYear: SchoolYear | null
  existingTerms: AcademicTerm[]
  term: AcademicTerm | null
  onClose: () => void
}) {
  const isNew = term === null
  const queryClient = useQueryClient()

  const suggestion =
    isNew && schoolYear ? suggestNextAcademicTerm(existingTerms, schoolYear) : null

  const [name, setName] = useState(term?.name ?? suggestion?.name ?? '')
  const [code, setCode] = useState(term?.code ?? suggestion?.code ?? '')
  const [codeManual, setCodeManual] = useState(!isNew)
  const [start, setStart] = useState(
    term?.start_date?.slice(0, 10) ?? suggestion?.start_date ?? ''
  )
  const [end, setEnd] = useState(term?.end_date?.slice(0, 10) ?? suggestion?.end_date ?? '')
  const [order, setOrder] = useState(term?.sort_order ?? suggestion?.sort_order ?? 1)
  const [active, setActive] = useState(term?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)

  function onNameChange(v: string) {
    setName(v)
    if (!codeManual) setCode(autoTermCode(v))
  }

  const save = useMutation({
    mutationFn: async () => {
      if (isNew) {
        return academicTermsApi.createAcademicTerm({
          school_year_id: schoolYearId,
          name,
          code,
          start_date: start,
          end_date: end,
          is_active: active,
        })
      }
      return academicTermsApi.updateAcademicTerm(term!.id, {
        name,
        code,
        start_date: start,
        end_date: end,
        sort_order: order,
        is_active: active,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] })
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
            {isNew ? 'Nouveau trimestre' : 'Modifier le trimestre'}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Nom *</span>
              <input required placeholder="Ex : 1er trimestre" value={name} onChange={(e) => onNameChange(e.target.value)} className="school-input" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Code *</span>
              <input required placeholder="Ex : T1-PB" value={code} onChange={(e) => { setCodeManual(true); setCode(e.target.value) }} className="school-input" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Date de début *</span>
              <input type="date" required value={start} onChange={(e) => setStart(e.target.value)} className="school-input" />
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
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
              <span className="text-school-ink">Actif</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="school-btn-secondary">Annuler</button>
            <button type="submit" disabled={save.isPending} className="school-btn-primary disabled:opacity-60">
              {save.isPending ? 'Enregistrement…' : isNew ? 'Ajouter le trimestre' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
