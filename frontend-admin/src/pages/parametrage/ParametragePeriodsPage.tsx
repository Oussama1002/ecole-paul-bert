import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import * as academicTermsApi from '../../api/academicTerms'
import type { AcademicTerm } from '../../api/academicTerms'
import * as evaluationPeriodsApi from '../../api/evaluationPeriods'
import type { EvaluationPeriod } from '../../api/evaluationPeriods'
import * as schoolYearsApi from '../../api/schoolYears'
import { useAuth } from '../../contexts/AuthContext'
import { EvalPeriodFormModal } from './EvalPeriodFormModal'
import { TermFormModal } from './TermFormModal'

export function ParametragePeriodsPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const canTerms = hasPermission('academic_terms.manage')
  const canEval = hasPermission('evaluation_periods.manage')

  const { data: years } = useQuery({
    queryKey: ['school-years-all'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({ per_page: 100, sort_by: 'start_date', sort_order: 'desc' }),
  })

  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [evalClosedFilter, setEvalClosedFilter] = useState<number | ''>('')

  const [termModal, setTermModal] = useState<{ mode: 'new' } | { mode: 'edit'; term: AcademicTerm } | null>(null)
  const [evalModal, setEvalModal] = useState<{ mode: 'new' } | { mode: 'edit'; period: EvaluationPeriod } | null>(null)

  useEffect(() => {
    if (years?.items.length && schoolYearId === 0) {
      const current = years.items.find((y) => y.is_current) ?? years.items[0]
      setSchoolYearId(current.id)
    }
  }, [years, schoolYearId])

  const { data: terms } = useQuery({
    queryKey: ['academic-terms', schoolYearId],
    queryFn: () =>
      academicTermsApi.fetchAcademicTerms({
        per_page: 100,
        school_year_id: schoolYearId,
        sort_by: 'sort_order',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
  })

  const { data: evalPeriods } = useQuery({
    queryKey: ['evaluation-periods', schoolYearId, evalClosedFilter],
    queryFn: () =>
      evaluationPeriodsApi.fetchEvaluationPeriods({
        per_page: 100,
        school_year_id: schoolYearId,
        is_closed: evalClosedFilter === '' ? undefined : Boolean(evalClosedFilter),
        sort_by: 'sort_order',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
  })

  const delTerm = useMutation({
    mutationFn: (id: number) => academicTermsApi.deleteAcademicTerm(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-terms'] }),
  })

  const delEval = useMutation({
    mutationFn: (id: number) => evaluationPeriodsApi.deleteEvaluationPeriod(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluation-periods'] }),
  })

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">
          Périodes académiques & évaluations
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Filtrez par année scolaire. Les chevauchements de dates sont contrôlés par l'API.
        </p>
      </div>

      <label className="block max-w-md">
        <span className="mb-1 block text-xs text-slate-500">Année scolaire</span>
        <select
          value={schoolYearId || ''}
          onChange={(e) => setSchoolYearId(Number(e.target.value))}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {years?.items.map((y) => (
            <option key={y.id} value={y.id}>{y.name}</option>
          ))}
        </select>
      </label>

      {schoolYearId > 0 && (
        <>
          {/* ── Trimestres ── */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-medium text-slate-800">Trimestres / semestres</h3>
              {canTerms && (
                <button
                  type="button"
                  onClick={() => setTermModal({ mode: 'new' })}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  + Nouveau trimestre
                </button>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Code</th>
                    <th className="px-4 py-2 text-left">Nom</th>
                    <th className="px-4 py-2 text-left">Début</th>
                    <th className="px-4 py-2 text-left">Fin</th>
                    <th className="px-4 py-2 text-left">Actif</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {terms?.items.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2 font-mono">{t.code}</td>
                      <td className="px-4 py-2">{t.name}</td>
                      <td className="px-4 py-2">{t.start_date}</td>
                      <td className="px-4 py-2">{t.end_date}</td>
                      <td className="px-4 py-2">{t.is_active ? 'Oui' : 'Non'}</td>
                      <td className="px-4 py-2 text-right">
                        {canTerms && (
                          <span className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setTermModal({ mode: 'edit', term: t })}
                              className="text-xs text-indigo-600 hover:underline"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Supprimer ce trimestre ?')) delTerm.mutate(t.id)
                              }}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Supprimer
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!terms?.items.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        Aucun trimestre pour cette année.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Périodes d'évaluation ── */}
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-lg font-medium text-slate-800">Périodes d'évaluation</h3>
              <div className="flex items-end gap-3">
                <label>
                  <span className="mb-1 block text-xs text-slate-500">État</span>
                  <select
                    value={evalClosedFilter === '' ? '' : evalClosedFilter}
                    onChange={(e) =>
                      setEvalClosedFilter(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Tous</option>
                    <option value={0}>Ouvertes</option>
                    <option value={1}>Fermées</option>
                  </select>
                </label>
                {canEval && (
                  <button
                    type="button"
                    onClick={() => setEvalModal({ mode: 'new' })}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    + Nouvelle période
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Code</th>
                    <th className="px-4 py-2 text-left">Nom</th>
                    <th className="px-4 py-2 text-left">Début</th>
                    <th className="px-4 py-2 text-left">Fin</th>
                    <th className="px-4 py-2 text-left">Fermée</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evalPeriods?.items.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2 font-mono">{p.code}</td>
                      <td className="px-4 py-2">{p.name}</td>
                      <td className="px-4 py-2">{p.start_date}</td>
                      <td className="px-4 py-2">{p.end_date}</td>
                      <td className="px-4 py-2">{p.is_closed ? 'Oui' : 'Non'}</td>
                      <td className="px-4 py-2 text-right">
                        {canEval && (
                          <span className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setEvalModal({ mode: 'edit', period: p })}
                              className="text-xs text-indigo-600 hover:underline"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Supprimer cette période ?')) delEval.mutate(p.id)
                              }}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Supprimer
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!evalPeriods?.items.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        Aucune période d'évaluation pour cette année.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {termModal && schoolYearId > 0 && (
        <TermFormModal
          schoolYearId={schoolYearId}
          schoolYear={years?.items.find((y) => y.id === schoolYearId) ?? null}
          existingTerms={terms?.items ?? []}
          term={termModal.mode === 'edit' ? termModal.term : null}
          onClose={() => setTermModal(null)}
        />
      )}

      {evalModal && schoolYearId > 0 && (
        <EvalPeriodFormModal
          schoolYearId={schoolYearId}
          period={evalModal.mode === 'edit' ? evalModal.period : null}
          terms={terms?.items ?? []}
          onClose={() => setEvalModal(null)}
        />
      )}
    </div>
  )
}
