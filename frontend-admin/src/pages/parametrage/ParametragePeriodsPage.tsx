import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import * as academicTermsApi from '../../api/academicTerms'
import * as evaluationPeriodsApi from '../../api/evaluationPeriods'
import * as schoolYearsApi from '../../api/schoolYears'
import { useAuth } from '../../contexts/AuthContext'
import { getApiErrorMessage } from '../../utils/apiError'

export function ParametragePeriodsPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const canTerms = hasPermission('academic_terms.manage')
  const canEval = hasPermission('evaluation_periods.manage')

  const { data: years } = useQuery({
    queryKey: ['school-years-all'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 100,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
  })

  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [evalClosedFilter, setEvalClosedFilter] = useState<number | ''>('')

  const [tName, setTName] = useState('')
  const [tCode, setTCode] = useState('')
  const [tStart, setTStart] = useState('')
  const [tEnd, setTEnd] = useState('')
  const [tOrder, setTOrder] = useState(1)
  const [tActive, setTActive] = useState(true)
  const [tErr, setTErr] = useState<string | null>(null)

  const [eTermId, setETermId] = useState<number | ''>('')
  const [eName, setEName] = useState('')
  const [eCode, setECode] = useState('')
  const [eStart, setEStart] = useState('')
  const [eEnd, setEEnd] = useState('')
  const [eOrder, setEOrder] = useState(1)
  const [eClosed, setEClosed] = useState(false)
  const [eErr, setEErr] = useState<string | null>(null)

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
        is_closed:
          evalClosedFilter === '' ? undefined : Boolean(evalClosedFilter),
        sort_by: 'sort_order',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
  })

  const createTerm = useMutation({
    mutationFn: () =>
      academicTermsApi.createAcademicTerm({
        school_year_id: schoolYearId,
        name: tName,
        code: tCode,
        start_date: tStart,
        end_date: tEnd,
        sort_order: tOrder,
        is_active: tActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] })
      setTName('')
      setTCode('')
      setTStart('')
      setTEnd('')
      setTOrder(1)
      setTActive(true)
      setTErr(null)
    },
    onError: (e: unknown) => setTErr(getApiErrorMessage(e, 'Impossible de créer le trimestre.')),
  })

  const createEval = useMutation({
    mutationFn: () =>
      evaluationPeriodsApi.createEvaluationPeriod({
        school_year_id: schoolYearId,
        term_id: eTermId === '' ? null : eTermId,
        name: eName,
        code: eCode,
        start_date: eStart,
        end_date: eEnd,
        sort_order: eOrder,
        is_closed: eClosed,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-periods'] })
      setEName('')
      setECode('')
      setEStart('')
      setEEnd('')
      setEOrder(1)
      setEClosed(false)
      setETermId('')
      setEErr(null)
    },
    onError: (e: unknown) => setEErr(getApiErrorMessage(e, "Impossible de créer la période d'évaluation.")),
  })

  const delTerm = useMutation({
    mutationFn: (id: number) => academicTermsApi.deleteAcademicTerm(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] }),
  })

  const delEval = useMutation({
    mutationFn: (id: number) =>
      evaluationPeriodsApi.deleteEvaluationPeriod(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['evaluation-periods'] }),
  })

  function submitTerm(e: FormEvent) {
    e.preventDefault()
    setTErr(null)
    createTerm.mutate()
  }

  function submitEval(e: FormEvent) {
    e.preventDefault()
    setEErr(null)
    createEval.mutate()
  }

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
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </label>

      {schoolYearId > 0 && (
        <>
          <section>
            <h3 className="mb-3 text-lg font-medium text-slate-800">
              Trimestres / semestres
            </h3>
            {canTerms && (
              <form
                onSubmit={submitTerm}
                className="mb-4 max-w-3xl rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <p className="mb-3 text-sm font-medium text-slate-700">Nouveau trimestre</p>
                {tErr && (
                  <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{tErr}</p>
                )}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <FieldGroup label="Nom *">
                    <input
                      required
                      placeholder="Ex : Trimestre 1"
                      value={tName}
                      onChange={(e) => setTName(e.target.value)}
                      className="rounded border border-slate-300 px-3 py-2 text-sm w-full"
                    />
                  </FieldGroup>
                  <FieldGroup label="Code *">
                    <input
                      required
                      placeholder="Ex : T1"
                      value={tCode}
                      onChange={(e) => setTCode(e.target.value)}
                      className="rounded border border-slate-300 px-3 py-2 text-sm w-full"
                    />
                  </FieldGroup>
                  <FieldGroup label="Ordre d'affichage">
                    <input
                      type="number"
                      min={0}
                      value={tOrder}
                      onChange={(e) => setTOrder(parseInt(e.target.value, 10) || 0)}
                      className="rounded border border-slate-300 px-3 py-2 text-sm w-full"
                    />
                  </FieldGroup>
                  <FieldGroup label="Date de début *">
                    <input
                      type="date"
                      required
                      value={tStart}
                      onChange={(e) => setTStart(e.target.value)}
                      className="rounded border border-slate-300 px-3 py-2 text-sm w-full"
                    />
                  </FieldGroup>
                  <FieldGroup label="Date de fin *">
                    <input
                      type="date"
                      required
                      value={tEnd}
                      onChange={(e) => setTEnd(e.target.value)}
                      className="rounded border border-slate-300 px-3 py-2 text-sm w-full"
                    />
                  </FieldGroup>
                  <FieldGroup label="Statut">
                    <label className="flex items-center gap-2 text-sm pt-2">
                      <input
                        type="checkbox"
                        checked={tActive}
                        onChange={(e) => setTActive(e.target.checked)}
                      />
                      Actif
                    </label>
                  </FieldGroup>
                </div>
                <button
                  type="submit"
                  disabled={createTerm.isPending}
                  className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {createTerm.isPending ? 'Enregistrement…' : 'Ajouter le trimestre'}
                </button>
              </form>
            )}
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
                      <td className="px-4 py-2">
                        {t.is_active ? 'Oui' : 'Non'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {canTerms && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Supprimer ce trimestre ?')) {
                                delTerm.mutate(t.id)
                              }
                            }}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Supprimer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-lg font-medium text-slate-800">
                Périodes d'évaluation
              </h3>
              <label>
                <span className="mb-1 block text-xs text-slate-500">État</span>
                <select
                  value={evalClosedFilter === '' ? '' : evalClosedFilter}
                  onChange={(e) =>
                    setEvalClosedFilter(
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Tous</option>
                  <option value={0}>Ouvertes</option>
                  <option value={1}>Fermées</option>
                </select>
              </label>
            </div>
            {canEval && (
              <form
                onSubmit={submitEval}
                className="mb-4 max-w-3xl rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <p className="mb-3 text-sm font-medium text-slate-700">Nouvelle période d'évaluation</p>
                {eErr && (
                  <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{eErr}</p>
                )}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <FieldGroup label="Trimestre (optionnel)" className="md:col-span-3">
                    <select
                      value={eTermId === '' ? '' : eTermId}
                      onChange={(e) =>
                        setETermId(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="rounded border border-slate-300 px-3 py-2 text-sm w-full"
                    >
                      <option value="">— Aucun trimestre —</option>
                      {terms?.items.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </FieldGroup>
                  <FieldGroup label="Nom *">
                    <input
                      required
                      placeholder="Ex : Période 1"
                      value={eName}
                      onChange={(e) => setEName(e.target.value)}
                      className="rounded border border-slate-300 px-3 py-2 text-sm w-full"
                    />
                  </FieldGroup>
                  <FieldGroup label="Code *">
                    <input
                      required
                      placeholder="Ex : P1"
                      value={eCode}
                      onChange={(e) => setECode(e.target.value)}
                      className="rounded border border-slate-300 px-3 py-2 text-sm w-full"
                    />
                  </FieldGroup>
                  <FieldGroup label="Ordre d'affichage">
                    <input
                      type="number"
                      min={0}
                      value={eOrder}
                      onChange={(e) => setEOrder(parseInt(e.target.value, 10) || 0)}
                      className="rounded border border-slate-300 px-3 py-2 text-sm w-full"
                    />
                  </FieldGroup>
                  <FieldGroup label="Date de début *">
                    <input
                      type="date"
                      required
                      value={eStart}
                      onChange={(e) => setEStart(e.target.value)}
                      className="rounded border border-slate-300 px-3 py-2 text-sm w-full"
                    />
                  </FieldGroup>
                  <FieldGroup label="Date de fin *">
                    <input
                      type="date"
                      required
                      value={eEnd}
                      onChange={(e) => setEEnd(e.target.value)}
                      className="rounded border border-slate-300 px-3 py-2 text-sm w-full"
                    />
                  </FieldGroup>
                  <FieldGroup label="Statut">
                    <label className="flex items-center gap-2 text-sm pt-2">
                      <input
                        type="checkbox"
                        checked={eClosed}
                        onChange={(e) => setEClosed(e.target.checked)}
                      />
                      Fermée
                    </label>
                  </FieldGroup>
                </div>
                <button
                  type="submit"
                  disabled={createEval.isPending}
                  className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {createEval.isPending ? 'Enregistrement…' : "Ajouter la période d'évaluation"}
                </button>
              </form>
            )}
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
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Supprimer cette période ?')) {
                                delEval.mutate(p.id)
                              }
                            }}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Supprimer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function FieldGroup({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </div>
  )
}
