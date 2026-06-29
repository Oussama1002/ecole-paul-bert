import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import * as classesApi from '../../api/classes'
import * as evaluationPeriodsApi from '../../api/evaluationPeriods'
import * as gradesApi from '../../api/grades'
import * as schoolYearsApi from '../../api/schoolYears'
import * as studentsApi from '../../api/students'
import * as subjectsApi from '../../api/subjects'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useAuth } from '../../contexts/AuthContext'
import { getApiErrorMessage } from '../../utils/apiError'

type Row = {
  student_id: number
  label: string
  score: number
  appreciation: string
  gradeId: number | null
}

export function GradesBulkClassPage() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const canOverrideLock = hasPermission('grades.override_lock')
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [classId, setClassId] = useState<number>(0)
  const [periodId, setPeriodId] = useState<number>(0)
  const [subjectId, setSubjectId] = useState<number>(0)
  const [maxScore, setMaxScore] = useState<number>(20)
  const [coefficient, setCoefficient] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: years } = useQuery({
    queryKey: ['school-years-grades'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 100,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
  })

  useEffect(() => {
    if (!years?.items.length || schoolYearId > 0) return
    const current = years.items.find((y) => y.is_current) ?? years.items[0]
    setSchoolYearId(current.id)
  }, [years, schoolYearId])

  const { data: classes } = useQuery({
    queryKey: ['classes-grades', schoolYearId],
    queryFn: () =>
      classesApi.fetchClasses({
        per_page: 100,
        school_year_id: schoolYearId,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
  })

  const { data: periods } = useQuery({
    queryKey: ['periods-grades', schoolYearId],
    queryFn: () =>
      evaluationPeriodsApi.fetchEvaluationPeriods({
        per_page: 100,
        school_year_id: schoolYearId,
        sort_by: 'sort_order',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
  })

  const subjectsQ = useQuery({
    queryKey: ['subjects-grades'],
    queryFn: () =>
      subjectsApi.fetchSubjects({ per_page: 500, sort_by: 'name', sort_order: 'asc' }),
  })

  const subjectOptions = useMemo(
    () =>
      (subjectsQ.data?.items ?? []).map((s) => ({
        value: s.id,
        label: s.name,
        hint: s.code,
      })),
    [subjectsQ.data?.items]
  )

  const yearOptions = useMemo(
    () =>
      (years?.items ?? []).map((y) => ({
        value: y.id,
        label: y.name,
        hint: y.is_current ? 'En cours' : undefined,
      })),
    [years?.items]
  )

  const classOptions = useMemo(
    () =>
      (classes?.items ?? []).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    [classes?.items]
  )

  const periodOptions = useMemo(
    () =>
      (periods?.items ?? []).map((p) => ({
        value: p.id,
        label: p.name,
        hint: p.is_closed ? '🔒 Clôturée' : undefined,
      })),
    [periods?.items]
  )

  const selectedPeriod = useMemo(
    () => (periods?.items ?? []).find((p) => p.id === periodId) ?? null,
    [periods?.items, periodId]
  )
  const isLocked = !!selectedPeriod?.is_closed
  const editingBlocked = isLocked && !canOverrideLock

  const { data: students, isError: studentsError, error: studentsErr, refetch: refetchStudents } = useQuery({
    queryKey: ['students-grades', schoolYearId, classId],
    queryFn: () =>
      studentsApi.fetchStudents({
        per_page: 100,
        school_year_id: schoolYearId,
        class_id: classId,
        sort_by: 'last_name',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0 && classId > 0,
  })

  const gradesQueryKey = ['grades-existing', schoolYearId, classId, periodId, subjectId]
  const { data: existingGrades, isFetching: loadingGrades, refetch: refetchGrades } = useQuery({
    queryKey: gradesQueryKey,
    queryFn: () =>
      gradesApi.fetchGrades({
        school_year_id: schoolYearId,
        evaluation_period_id: periodId,
        class_id: classId,
        subject_id: subjectId,
        per_page: 200,
      }),
    enabled: schoolYearId > 0 && classId > 0 && periodId > 0 && subjectId > 0,
    staleTime: 0,
  })

  const allGradesKey = ['grades-all-class', schoolYearId, classId, periodId]
  const { data: allClassGrades, isFetching: loadingAllGrades } = useQuery({
    queryKey: allGradesKey,
    queryFn: () =>
      gradesApi.fetchGrades({
        school_year_id: schoolYearId,
        evaluation_period_id: periodId,
        class_id: classId,
        per_page: 200,
      }),
    enabled: schoolYearId > 0 && classId > 0 && periodId > 0,
    staleTime: 0,
  })

  const initialRows = useMemo<Row[]>(() => {
    const items = students?.items ?? []
    const gradeMap = new Map(
      (existingGrades?.items ?? []).map((g) => [g.student_id, g])
    )
    return items.map((s) => {
      const existing = gradeMap.get(s.id)
      return {
        student_id: s.id,
        label: `${s.last_name} ${s.first_name}`,
        score: existing ? parseFloat(existing.score) : 0,
        appreciation: existing?.appreciation ?? '',
        gradeId: existing?.id ?? null,
      }
    })
  }, [students?.items, existingGrades?.items])

  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    setRows(initialRows)
    setError(null)
  }, [initialRows, classId, schoolYearId])

  const bulk = useMutation({
    mutationFn: async () => {
      setError(null)
      setSuccessMsg(null)
      if (!schoolYearId || !classId || !periodId || !subjectId) {
        throw new Error('Renseignez année, classe, période et matière.')
      }
      const toUpdate = rows.filter((r) => r.gradeId !== null)
      const toInsert = rows.filter((r) => r.gradeId === null)

      await Promise.all(
        toUpdate.map((r) =>
          gradesApi.updateGrade(r.gradeId!, {
            score: r.score,
            max_score: maxScore,
            coefficient,
            appreciation: r.appreciation.trim() || null,
          })
        )
      )

      if (toInsert.length > 0) {
        await gradesApi.bulkStoreGrades({
          school_year_id: schoolYearId,
          evaluation_period_id: periodId,
          class_id: classId,
          subject_id: subjectId,
          max_score: maxScore,
          coefficient,
          items: toInsert.map((r) => ({
            student_id: r.student_id,
            score: r.score,
            appreciation: r.appreciation.trim() || null,
          })),
        })
      }

      return { updated: toUpdate.length, inserted: toInsert.length }
    },
    onSuccess: (result) => {
      setError(null)
      setShowModal(false)
      setSuccessMsg(
        `${result.updated + result.inserted} note(s) enregistrée(s) avec succès.`
      )
      void queryClient.invalidateQueries({ queryKey: gradesQueryKey })
      void queryClient.invalidateQueries({ queryKey: allGradesKey })
      void refetchGrades()
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Enregistrement impossible.')),
  })

  const selectedClassName = classes?.items.find((c) => c.id === classId)?.name ?? ''
  const selectedPeriodName = selectedPeriod?.name ?? ''

  const gradesBySubject = useMemo(() => {
    if (!allClassGrades?.items.length) return new Map<number, typeof allClassGrades.items>()
    const map = new Map<number, typeof allClassGrades.items>()
    for (const g of allClassGrades.items) {
      const arr = map.get(g.subject_id) ?? []
      arr.push(g)
      map.set(g.subject_id, arr)
    }
    return map
  }, [allClassGrades?.items])

  const studentMap = useMemo(() => {
    const m = new Map<number, { last_name: string; first_name: string }>()
    for (const s of students?.items ?? []) {
      m.set(s.id, { last_name: s.last_name, first_name: s.first_name })
    }
    return m
  }, [students?.items])

  const subjectMap = useMemo(() => {
    const m = new Map<number, { name: string; code: string }>()
    for (const s of subjectsQ.data?.items ?? []) {
      m.set(s.id, { name: s.name, code: s.code })
    }
    return m
  }, [subjectsQ.data?.items])

  function openEditSubject(subjectIdToEdit: number, grades: gradesApi.Grade[]) {
    const first = grades[0]
    if (first) {
      setMaxScore(parseFloat(first.max_score) || 20)
      setCoefficient(parseFloat(first.coefficient) || 1)
    }
    setSubjectId(subjectIdToEdit)
    setSuccessMsg(null)
    setError(null)
    setShowModal(true)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-school-ink">Saisie des notes par classe</h2>
        <p className="text-sm text-school-inkmuted">Sélectionnez la classe, la période et la matière, puis entrez les notes de chaque élève.</p>
      </div>

      <div className="grid gap-3 rounded-3xl border-2 border-school-line bg-white p-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-xs font-bold text-school-inkmuted">1. Année scolaire</span>
          <div className="mt-1">
            <SearchSelect
              value={schoolYearId || null}
              onChange={(v) => {
                setSchoolYearId(v ?? 0)
                setClassId(0)
                setPeriodId(0)
              }}
              options={yearOptions}
              placeholder="Choisir une année…"
            />
          </div>
        </label>

        <label className="block text-sm">
          <span className="text-xs font-bold text-school-inkmuted">2. Classe</span>
          <div className="mt-1">
            <SearchSelect
              value={classId || null}
              onChange={(v) => setClassId(v ?? 0)}
              options={classOptions}
              disabled={!schoolYearId}
              placeholder={schoolYearId ? 'Choisir une classe…' : "Année d'abord"}
            />
          </div>
        </label>

        <label className="block text-sm">
          <span className="text-xs font-bold text-school-inkmuted">3. Période</span>
          <div className="mt-1">
            <SearchSelect
              value={periodId || null}
              onChange={(v) => setPeriodId(v ?? 0)}
              options={periodOptions}
              disabled={!schoolYearId}
              placeholder={schoolYearId ? 'Choisir une période…' : "Année d'abord"}
            />
          </div>
        </label>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-school-leaf/30 bg-school-leaf/5 px-4 py-3 text-sm font-semibold text-school-leafdeep">
          <span className="text-lg">✅</span> {successMsg}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { setShowModal(true); setSuccessMsg(null) }}
          disabled={!schoolYearId || !classId || !periodId}
          className="school-btn-primary"
        >
          ✏️ Saisir les notes
        </button>
      </div>

      {/* ── Saved Grades Summary ── */}
      {schoolYearId > 0 && classId > 0 && periodId > 0 && (
        <section className="school-section">
          <div className="school-section-title mb-4">
            <span className="school-section-title-icon bg-school-grape/20">📊</span>
            Notes enregistrées
            {selectedClassName && (
              <span className="school-chip ml-2">{selectedClassName}</span>
            )}
            {selectedPeriodName && (
              <span className="school-chip ml-1">{selectedPeriodName}</span>
            )}
          </div>

          {loadingAllGrades && <LoadingState label="Chargement des notes…" lines={3} />}

          {!loadingAllGrades && gradesBySubject.size === 0 && (
            <EmptyState
              emoji="📝"
              title="Aucune note enregistrée"
              hint="Cliquez sur « Saisir les notes » pour commencer."
            />
          )}

          {!loadingAllGrades && gradesBySubject.size > 0 && (
            <div className="space-y-4">
              {Array.from(gradesBySubject.entries()).map(([sid, grades]) => {
                const subj = subjectMap.get(sid)
                const avg = grades.length > 0
                  ? grades.reduce((s, g) => s + parseFloat(g.score), 0) / grades.length
                  : 0
                const maxS = grades.length > 0 ? parseFloat(grades[0].max_score) : 20
                return (
                  <div key={sid} className="rounded-2xl border-2 border-school-line bg-white">
                    <div className="flex items-center justify-between border-b-2 border-school-line px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-school-ink">
                          {subj?.name ?? `Matière #${sid}`}
                        </span>
                        {subj?.code && (
                          <span className="school-badge-purple text-[10px]">{subj.code}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span className="text-school-inkmuted">
                          {grades.length} note{grades.length > 1 ? 's' : ''}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 ${
                          avg >= (maxS * 0.7) ? 'bg-school-leaf/15 text-school-leafdeep'
                          : avg >= (maxS * 0.5) ? 'bg-school-sky/15 text-school-skydeep'
                          : avg >= (maxS * 0.35) ? 'bg-school-mango/15 text-[#92400E]'
                          : 'bg-school-coral/15 text-[#B23A2E]'
                        }`}>
                          Moy. {avg.toFixed(2)} / {maxS}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEditSubject(sid, grades)}
                          disabled={editingBlocked}
                          title={
                            editingBlocked
                              ? 'Période clôturée — modification impossible'
                              : 'Modifier les notes de cette matière'
                          }
                          className="school-btn-secondary !px-3 !py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ✏️ Modifier
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="school-table">
                        <thead>
                          <tr>
                            <th className="w-1/3">Élève</th>
                            <th className="w-24 text-center">Note</th>
                            <th className="w-24 text-center">/ Max</th>
                            <th>Appréciation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grades
                            .sort((a, b) => {
                              const sa = studentMap.get(a.student_id)
                              const sb = studentMap.get(b.student_id)
                              return (sa?.last_name ?? '').localeCompare(sb?.last_name ?? '')
                            })
                            .map((g) => {
                            const st = studentMap.get(g.student_id)
                            const score = parseFloat(g.score)
                            const max = parseFloat(g.max_score)
                            const pct = max > 0 ? score / max : 0
                            return (
                              <tr key={g.id}>
                                <td className="font-semibold">
                                  {st ? `${st.last_name} ${st.first_name}` : `Élève #${g.student_id}`}
                                </td>
                                <td className="text-center">
                                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                                    pct >= 0.7 ? 'bg-school-leaf/15 text-school-leafdeep'
                                    : pct >= 0.5 ? 'bg-school-sky/15 text-school-skydeep'
                                    : pct >= 0.35 ? 'bg-school-mango/15 text-[#92400E]'
                                    : 'bg-school-coral/15 text-[#B23A2E]'
                                  }`}>
                                    {g.score}
                                  </span>
                                </td>
                                <td className="text-center text-school-inkmuted">
                                  {g.max_score}
                                </td>
                                <td className="text-school-inkmuted">
                                  {g.appreciation || '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Modal ── */}
      {showModal && (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10"
        onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
      >
      <div className="w-full max-w-4xl rounded-3xl border-2 border-school-line bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-school-line bg-white px-6 py-4 rounded-t-3xl">
        <div>
          <h3 className="font-display text-lg font-bold text-school-ink">Saisie des notes par classe</h3>
          <p className="text-xs text-school-inkmuted">Sélectionnez la matière, puis renseignez les notes.</p>
        </div>
        <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border-2 border-school-line px-3 py-1 text-sm font-semibold text-school-inkmuted hover:bg-school-cream">✕ Fermer</button>
      </div>
      <div className="space-y-4 p-6">
      {isLocked && (
        <div
          className={[
            'flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-2 text-sm',
            editingBlocked
              ? 'border-school-mango/30 bg-school-mango/5 text-[#92400E]'
              : 'border-school-sky/30 bg-school-sky/5 text-school-skydeep',
          ].join(' ')}
        >
          <span>
            🔒 Période <strong>{selectedPeriod?.name}</strong> clôturée.
            {editingBlocked
              ? ' Saisie verrouillée — contactez la direction pour rouvrir.'
              : ' Vous pouvez encore enregistrer (permission « grades.override_lock »).'}
          </span>
        </div>
      )}

      <div className="grid gap-3 rounded-2xl border-2 border-school-line bg-white p-4 md:grid-cols-3">
        <label className="block text-sm md:col-span-1">
          <span className="text-xs font-bold text-school-inkmuted">Matière *</span>
          <div className="mt-1">
            <SearchSelect
              value={subjectId || null}
              onChange={(v) => setSubjectId(v ?? 0)}
              options={subjectOptions}
              isLoading={subjectsQ.isLoading}
              isError={subjectsQ.isError}
              placeholder="Rechercher une matière…"
            />
          </div>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-bold text-school-inkmuted">Note max</span>
          <input
            type="number"
            value={maxScore}
            onChange={(e) => setMaxScore(Number(e.target.value))}
            className="school-input mt-1"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-bold text-school-inkmuted">Coefficient</span>
          <input
            type="number"
            value={coefficient}
            onChange={(e) => setCoefficient(Number(e.target.value))}
            className="school-input mt-1"
          />
        </label>
      </div>

      {loadingGrades && subjectId > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-school-line bg-school-bg px-4 py-2 text-sm text-school-inkmuted">
          <span className="animate-spin">⏳</span> Chargement des notes existantes…
        </div>
      )}

      {!loadingGrades && subjectId > 0 && rows.some((r) => r.gradeId !== null) && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-school-sky/30 bg-school-sky/5 px-4 py-2 text-sm font-semibold text-school-skydeep">
          ✏️ <strong>{rows.filter((r) => r.gradeId !== null).length} note(s)</strong> déjà saisies — pré-remplies ci-dessous. Modifiez et enregistrez pour mettre à jour.
        </div>
      )}

      {error && <ErrorState title="Échec d'enregistrement" fallback={error} />}
      {studentsError && (
        <ErrorState
          error={studentsErr}
          fallback="Impossible de charger les élèves de la classe."
          onRetry={() => void refetchStudents()}
        />
      )}

      <div className="school-table-wrap">
        {!students && classId > 0 ? (
          <LoadingState label="Chargement des élèves…" lines={3} />
        ) : null}
        <table className="school-table">
          <thead>
            <tr>
              <th>Élève</th>
              <th className="w-28">Note</th>
              <th>Appréciation</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-3" colSpan={3}>
                  <EmptyState
                    emoji="📝"
                    title="Aucune note à saisir pour le moment"
                    hint="Sélectionnez une année et une classe pour afficher les élèves."
                    action={
                      classId > 0 ? (
                        <button
                          type="button"
                          onClick={() => void refetchStudents()}
                          className="school-btn-secondary"
                        >
                          Réessayer
                        </button>
                      ) : null
                    }
                  />
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r.student_id}>
                  <td>
                    <span className="flex items-center gap-1.5 font-semibold">
                      {r.label}
                      {r.gradeId !== null && (
                        <span className="school-badge-purple text-[10px]">
                          existante
                        </span>
                      )}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={r.score}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, score: Number(e.target.value) } : x
                          )
                        )
                      }
                      disabled={editingBlocked}
                      className="school-input w-24 !py-1.5 text-center"
                    />
                  </td>
                  <td>
                    <input
                      value={r.appreciation}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, appreciation: e.target.value } : x
                          )
                        )
                      }
                      disabled={editingBlocked}
                      className="school-input !py-1.5"
                      placeholder="Optionnel…"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-b-3xl border-t-2 border-school-line bg-white px-6 py-4">
        <span className="text-xs font-semibold text-school-inkmuted">
          {rows.length} élève{rows.length > 1 ? 's' : ''}
          {subjectId > 0 ? ' · Matière sélectionnée' : ' · Sélectionnez une matière'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="school-btn-secondary"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => bulk.mutate()}
            disabled={
              bulk.isPending ||
              !schoolYearId ||
              !classId ||
              !periodId ||
              !subjectId ||
              editingBlocked
            }
            className="school-btn-primary"
          >
            {bulk.isPending ? 'Enregistrement…' : '💾 Enregistrer les notes'}
          </button>
        </div>
      </div>
      </div>
      </div>
      )}
    </div>
  )
}
