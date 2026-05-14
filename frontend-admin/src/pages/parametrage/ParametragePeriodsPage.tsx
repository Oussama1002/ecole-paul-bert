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

  // Term form
  const [tEditId, setTEditId] = useState<number | null>(null)
  const [tName, setTName] = useState('')
  const [tCode, setTCode] = useState('')
  const [tCodeManual, setTCodeManual] = useState(false)
  const [tStart, setTStart] = useState('')
  const [tEnd, setTEnd] = useState('')
  const [tOrder, setTOrder] = useState(1)
  const [tActive, setTActive] = useState(true)
  const [tErr, setTErr] = useState<string | null>(null)

  // Eval period form
  const [eEditId, setEEditId] = useState<number | null>(null)
  const [eTermId, setETermId] = useState<number | ''>('')
  const [eName, setEName] = useState('')
  const [eCode, setECode] = useState('')
  const [eCodeManual, setECodeManual] = useState(false)
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

  useEffect(() => {
    if (!tCodeManual) setTCode(autoTermCode(tName))
  }, [tName, tCodeManual])

  useEffect(() => {
    if (!eCodeManual) setECode(autoEvalCode(eName))
  }, [eName, eCodeManual])

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

  function resetTermForm() {
    setTEditId(null)
    setTName('')
    setTCode('')
    setTCodeManual(false)
    setTStart('')
    setTEnd('')
    setTOrder(1)
    setTActive(true)
    setTErr(null)
  }

  function resetEvalForm() {
    setEEditId(null)
    setEName('')
    setECode('')
    setECodeManual(false)
    setEStart('')
    setEEnd('')
    setEOrder(1)
    setEClosed(false)
    setETermId('')
    setEErr(null)
  }

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
      resetTermForm()
    },
    onError: (e: unknown) => setTErr(getApiErrorMessage(e, 'Impossible de créer le trimestre.')),
  })

  const updateTerm = useMutation({
    mutationFn: () =>
      academicTermsApi.updateAcademicTerm(tEditId!, {
        name: tName,
        code: tCode,
        start_date: tStart,
        end_date: tEnd,
        sort_order: tOrder,
        is_active: tActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] })
      resetTermForm()
    },
    onError: (e: unknown) => setTErr(getApiErrorMessage(e, 'Impossible de modifier le trimestre.')),
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
      resetEvalForm()
    },
    onError: (e: unknown) => setEErr(getApiErrorMessage(e, "Impossible de créer la période d'évaluation.")),
  })

  const updateEval = useMutation({
    mutationFn: () =>
      evaluationPeriodsApi.updateEvaluationPeriod(eEditId!, {
        term_id: eTermId === '' ? null : (eTermId as number),
        name: eName,
        code: eCode,
        start_date: eStart,
        end_date: eEnd,
        sort_order: eOrder,
        is_closed: eClosed,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-periods'] })
      resetEvalForm()
    },
    onError: (e: unknown) => setEErr(getApiErrorMessage(e, "Impossible de modifier la période d'évaluation.")),
  })

  const delTerm = useMutation({
    mutationFn: (id: number) => academicTermsApi.deleteAcademicTerm(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-terms'] }),
  })

  const delEval = useMutation({
    mutationFn: (id: number) => evaluationPeriodsApi.deleteEvaluationPeriod(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluation-periods'] }),
  })

  function submitTerm(e: FormEvent) {
    e.preventDefault()
    setTErr(null)
    if (tEditId) updateTerm.mutate()
    else createTerm.mutate()
  }

  function submitEval(e: FormEvent) {
    e.preventDefault()
    setEErr(null)
    if (eEditId) updateEval.mutate()
    else createEval.mutate()
  }

  const tPending = createTerm.isPending || updateTerm.isPending
  const ePending = createEval.isPending || updateEval.isPending

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
          {/* ── Trimestres ── */}
          <section>
            <h3 className="mb-3 text-lg font-medium text-slate-800">Trimestres / semestres</h3>
            {canTerms && (
              <form
                onSubmit={submitTerm}
                className="mb-4 max-w-3xl rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <p className="mb-3 text-sm font-medium text-slate-700">
                  {tEditId ? 'Modifier le trimestre' : 'Nouveau trimestre'}
                </p>
                {tErr && (
                  <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{tErr}</p>
                )}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <FieldGroup label="Nom *">
                    <input
                      required
                      placeholder="Ex : 1er trimestre"
                      value={tName}
                      onChange={(e) => setTName(e.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </FieldGroup>
                  <FieldGroup label="Code *">
                    <input
                      required
                      placeholder="Ex : T1-PB"
                      value={tCode}
                      onChange={(e) => { setTCodeManual(true); setTCode(e.target.value) }}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </FieldGroup>
                  <FieldGroup label="Ordre d'affichage">
                    <input
                      type="number"
                      min={0}
                      value={tOrder}
                      onChange={(e) => setTOrder(parseInt(e.target.value, 10) || 0)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </FieldGroup>
                  <FieldGroup label="Date de début *">
                    <input
                      type="date"
                      required
                      value={tStart}
                      onChange={(e) => setTStart(e.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </FieldGroup>
                  <FieldGroup label="Date de fin *">
                    <input
                      type="date"
                      required
                      value={tEnd}
                      onChange={(e) => setTEnd(e.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </FieldGroup>
                  <FieldGroup label="Statut">
                    <label className="flex items-center gap-2 pt-2 text-sm">
                      <input
                        type="checkbox"
                        checked={tActive}
                        onChange={(e) => setTActive(e.target.checked)}
                      />
                      Actif
                    </label>
                  </FieldGroup>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={tPending}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {tPending ? 'Enregistrement…' : tEditId ? 'Mettre à jour' : 'Ajouter le trimestre'}
                  </button>
                  {tEditId && (
                    <button
                      type="button"
                      onClick={resetTermForm}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Annuler
                    </button>
                  )}
                </div>
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
                    <tr key={t.id} className={tEditId === t.id ? 'bg-indigo-50' : ''}>
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
                              onClick={() => {
                                setTEditId(t.id)
                                setTName(t.name)
                                setTCode(t.code)
                                setTCodeManual(true)
                                setTStart(t.start_date?.slice(0, 10) ?? '')
                                setTEnd(t.end_date?.slice(0, 10) ?? '')
                                setTOrder(t.sort_order ?? 1)
                                setTActive(t.is_active ?? true)
                                setTErr(null)
                              }}
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
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Périodes d'évaluation ── */}
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-lg font-medium text-slate-800">Périodes d'évaluation</h3>
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
            </div>
            {canEval && (
              <form
                onSubmit={submitEval}
                className="mb-4 max-w-3xl rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <p className="mb-3 text-sm font-medium text-slate-700">
                  {eEditId ? "Modifier la période d'évaluation" : "Nouvelle période d'évaluation"}
                </p>
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
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
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
                      placeholder="Ex : Évaluation 1"
                      value={eName}
                      onChange={(e) => setEName(e.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </FieldGroup>
                  <FieldGroup label="Code *">
                    <input
                      required
                      placeholder="Ex : EP1-PB"
                      value={eCode}
                      onChange={(e) => { setECodeManual(true); setECode(e.target.value) }}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </FieldGroup>
                  <FieldGroup label="Ordre d'affichage">
                    <input
                      type="number"
                      min={0}
                      value={eOrder}
                      onChange={(e) => setEOrder(parseInt(e.target.value, 10) || 0)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </FieldGroup>
                  <FieldGroup label="Date de début *">
                    <input
                      type="date"
                      required
                      value={eStart}
                      onChange={(e) => setEStart(e.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </FieldGroup>
                  <FieldGroup label="Date de fin *">
                    <input
                      type="date"
                      required
                      value={eEnd}
                      onChange={(e) => setEEnd(e.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </FieldGroup>
                  <FieldGroup label="Statut">
                    <label className="flex items-center gap-2 pt-2 text-sm">
                      <input
                        type="checkbox"
                        checked={eClosed}
                        onChange={(e) => setEClosed(e.target.checked)}
                      />
                      Fermée
                    </label>
                  </FieldGroup>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={ePending}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {ePending ? 'Enregistrement…' : eEditId ? 'Mettre à jour' : "Ajouter la période d'évaluation"}
                  </button>
                  {eEditId && (
                    <button
                      type="button"
                      onClick={resetEvalForm}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Annuler
                    </button>
                  )}
                </div>
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
                    <tr key={p.id} className={eEditId === p.id ? 'bg-indigo-50' : ''}>
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
                              onClick={() => {
                                setEEditId(p.id)
                                setEName(p.name)
                                setECode(p.code)
                                setECodeManual(true)
                                setETermId(p.term_id ?? '')
                                setEStart(p.start_date?.slice(0, 10) ?? '')
                                setEEnd(p.end_date?.slice(0, 10) ?? '')
                                setEOrder(p.sort_order ?? 1)
                                setEClosed(p.is_closed ?? false)
                                setEErr(null)
                              }}
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
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function autoTermCode(name: string): string {
  const match = name.match(/\d+/)
  return match ? `T${match[0]}-PB` : ''
}

function autoEvalCode(name: string): string {
  const match = name.match(/\d+/)
  return match ? `EP${match[0]}-PB` : ''
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
