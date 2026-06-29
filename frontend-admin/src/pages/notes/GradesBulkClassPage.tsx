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
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { StatBar } from '../../components/ui/StatBar'
import { StudentAvatar } from '../../components/ui/StudentAvatar'
import { useAuth } from '../../contexts/AuthContext'
import { getApiErrorMessage } from '../../utils/apiError'

type Row = {
  student_id: number
  first_name: string
  last_name: string
  label: string
  score: number
  appreciation: string
  gradeId: number | null
}

function scoreTone(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0
  if (pct >= 0.7) return 'bg-school-leaf/15 text-school-leafdeep'
  if (pct >= 0.5) return 'bg-school-sky/15 text-school-skydeep'
  if (pct >= 0.35) return 'bg-school-mango/15 text-[#92400E]'
  return 'bg-school-coral/15 text-[#B23A2E]'
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

  const {
    data: students,
    isError: studentsError,
    error: studentsErr,
    refetch: refetchStudents,
    isLoading: studentsLoading,
  } = useQuery({
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
    const gradeMap = new Map((existingGrades?.items ?? []).map((g) => [g.student_id, g]))
    return items.map((s) => {
      const existing = gradeMap.get(s.id)
      return {
        student_id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
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
  const selectedYearName = years?.items.find((y) => y.id === schoolYearId)?.name ?? ''
  const selectedPeriodName = selectedPeriod?.name ?? ''
  const selectedSubjectName =
    subjectId > 0
      ? subjectsQ.data?.items.find((s) => s.id === subjectId)?.name
      : null

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

  const summaryStats = useMemo(() => {
    const items = allClassGrades?.items ?? []
    const subjectCount = gradesBySubject.size
    const totalGrades = items.length
    let normalizedAvg = 0
    if (items.length > 0) {
      const sum = items.reduce((s, g) => {
        const score = parseFloat(g.score)
        const max = parseFloat(g.max_score) || 20
        return s + (max > 0 ? (score / max) * 20 : score)
      }, 0)
      normalizedAvg = sum / items.length
    }
    return { subjectCount, totalGrades, normalizedAvg }
  }, [allClassGrades?.items, gradesBySubject])

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

  const existingInModal = rows.filter((r) => r.gradeId !== null).length

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

  function openNewEntry() {
    setSubjectId(0)
    setSuccessMsg(null)
    setError(null)
    setShowModal(true)
  }

  const selectionReady = schoolYearId > 0 && classId > 0 && periodId > 0

  return (
    <div className="space-y-5">
      <PageHeader
        emoji="✏️"
        title="Saisie des notes par classe"
        subtitle="Sélectionnez la classe et la période, puis saisissez les notes par matière."
        actions={
          <button
            type="button"
            onClick={openNewEntry}
            disabled={!selectionReady}
            className="school-btn-primary"
          >
            + Saisir les notes
          </button>
        }
      />

      {/* Context hero */}
      <div className="school-hero !from-school-grape !via-school-bubblegum !to-school-skydeep">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              Bulletin — saisie collective
            </p>
            <p className="mt-1 font-display text-xl font-bold sm:text-2xl">
              {selectedClassName || 'Choisissez une classe'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedYearName && (
                <span className="school-chip-on-dark">{selectedYearName}</span>
              )}
              {selectedPeriodName && (
                <span className="school-chip-on-dark">
                  {isLocked ? '🔒 ' : ''}
                  {selectedPeriodName}
                </span>
              )}
              {students?.items.length ? (
                <span className="school-chip-on-dark">
                  🎒 {students.items.length} élève(s)
                </span>
              ) : null}
            </div>
          </div>
          {selectionReady && summaryStats.totalGrades > 0 && (
            <div className="rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-center backdrop-blur">
              <p className="font-display text-3xl font-bold">
                {summaryStats.normalizedAvg.toFixed(1)}
              </p>
              <p className="text-xs font-semibold text-white/80">moy. / 20</p>
            </div>
          )}
        </div>
      </div>

      {/* KPI tiles */}
      {selectionReady && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="school-tile school-accent-purple">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  Matières saisies
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-school-ink">
                  {summaryStats.subjectCount}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-grape/15 text-2xl">
                📚
              </div>
            </div>
          </div>
          <div className="school-tile school-accent-blue">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  Notes enregistrées
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-school-skydeep">
                  {summaryStats.totalGrades}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-sky/15 text-2xl">
                📝
              </div>
            </div>
          </div>
          <div className="school-tile school-accent-green">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  Moyenne classe
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-school-leafdeep">
                  {summaryStats.totalGrades > 0
                    ? summaryStats.normalizedAvg.toFixed(2)
                    : '—'}
                  <span className="text-lg text-school-inkmuted"> /20</span>
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-leaf/15 text-2xl">
                🎓
              </div>
            </div>
            {summaryStats.totalGrades > 0 && (
              <div className="mt-3">
                <StatBar
                  value={summaryStats.normalizedAvg}
                  max={20}
                  tone="leaf"
                  caption="Moyenne normalisée sur /20"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="school-section">
        <SectionTitle
          emoji="🔎"
          title="Sélection"
          hint="Étape 1 : année, classe et période d'évaluation."
          iconClassName="bg-school-mist text-school-skydeep"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Année scolaire
            </span>
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
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Classe
            </span>
            <SearchSelect
              value={classId || null}
              onChange={(v) => setClassId(v ?? 0)}
              options={classOptions}
              disabled={!schoolYearId}
              placeholder={schoolYearId ? 'Choisir une classe…' : "Année d'abord"}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Période
            </span>
            <SearchSelect
              value={periodId || null}
              onChange={(v) => setPeriodId(v ?? 0)}
              options={periodOptions}
              disabled={!schoolYearId}
              placeholder={schoolYearId ? 'Choisir une période…' : "Année d'abord"}
            />
          </label>
        </div>
      </section>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-school-leaf/40 bg-school-leaf/10 px-4 py-3 text-sm font-semibold text-school-leafdeep">
          <span className="text-lg">✅</span> {successMsg}
        </div>
      )}

      {isLocked && selectionReady && (
        <div
          className={[
            'flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-semibold',
            editingBlocked
              ? 'border-school-mango/40 bg-school-mango/10 text-[#92400E]'
              : 'border-school-sky/40 bg-school-sky/10 text-school-skydeep',
          ].join(' ')}
        >
          🔒 Période <strong>{selectedPeriod?.name}</strong> clôturée.
          {editingBlocked
            ? ' Saisie verrouillée — contactez la direction pour rouvrir.'
            : ' Vous pouvez encore enregistrer (permission spéciale).'}
        </div>
      )}

      {!selectionReady && (
        <EmptyState
          emoji="🪧"
          title="Complétez la sélection"
          hint="Choisissez l'année scolaire, la classe et la période pour afficher les notes enregistrées."
        />
      )}

      {studentsLoading && classId > 0 && (
        <LoadingState label="Chargement des élèves…" lines={3} />
      )}

      {/* Saved grades summary */}
      {selectionReady && (
        <section className="school-section">
          <SectionTitle
            emoji="📊"
            title="Notes enregistrées"
            hint={
              selectedClassName && selectedPeriodName
                ? `${selectedClassName} · ${selectedPeriodName}`
                : undefined
            }
            iconClassName="bg-school-grape/20 text-school-grape"
            actions={
              <button
                type="button"
                onClick={openNewEntry}
                disabled={editingBlocked}
                className="school-btn-secondary !py-1.5 !text-xs disabled:opacity-50"
              >
                + Nouvelle matière
              </button>
            }
          />

          {loadingAllGrades && <LoadingState label="Chargement des notes…" lines={3} />}

          {!loadingAllGrades && gradesBySubject.size === 0 && (
            <EmptyState
              emoji="📝"
              title="Aucune note enregistrée"
              hint="Cliquez sur « Saisir les notes » pour commencer."
              action={
                <button type="button" onClick={openNewEntry} className="school-btn-primary">
                  + Saisir les notes
                </button>
              }
            />
          )}

          {!loadingAllGrades && gradesBySubject.size > 0 && (
            <div className="space-y-4">
              {Array.from(gradesBySubject.entries()).map(([sid, grades]) => {
                const subj = subjectMap.get(sid)
                const avg =
                  grades.length > 0
                    ? grades.reduce((s, g) => s + parseFloat(g.score), 0) / grades.length
                    : 0
                const maxS = grades.length > 0 ? parseFloat(grades[0].max_score) : 20
                return (
                  <div
                    key={sid}
                    className="overflow-hidden rounded-2xl border-2 border-school-line bg-white shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-school-line bg-school-cream/40 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-school-grape/15 text-lg">
                          📘
                        </span>
                        <div>
                          <p className="font-display text-sm font-bold text-school-ink">
                            {subj?.name ?? `Matière #${sid}`}
                          </p>
                          {subj?.code && (
                            <span className="school-badge-purple text-[10px]">{subj.code}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="school-pill-muted">
                          {grades.length} note{grades.length > 1 ? 's' : ''}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 ${scoreTone(avg, maxS)}`}
                        >
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
                    <div className="school-table-wrap !rounded-none !border-0">
                      <table className="school-table">
                        <thead>
                          <tr>
                            <th>Élève</th>
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
                              return (
                                <tr key={g.id}>
                                  <td>
                                    <div className="flex items-center gap-3">
                                      <StudentAvatar
                                        firstName={st?.first_name}
                                        lastName={st?.last_name}
                                        seed={g.student_id}
                                      />
                                      <span className="font-semibold">
                                        {st
                                          ? `${st.last_name} ${st.first_name}`
                                          : `Élève #${g.student_id}`}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <span
                                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreTone(score, max)}`}
                                    >
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

      {/* Entry modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8 sm:pt-12"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false)
          }}
        >
          <div className="mb-8 w-full max-w-4xl rounded-3xl border-2 border-school-line bg-school-bg shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b-2 border-school-line bg-gradient-to-r from-school-grape/10 via-school-bubblegum/10 to-school-sky/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                  ✏️
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-school-ink">
                    Saisie des notes
                  </h3>
                  <p className="text-xs font-medium text-school-inkmuted">
                    {selectedClassName}
                    {selectedPeriodName ? ` · ${selectedPeriodName}` : ''}
                    {selectedSubjectName ? ` · ${selectedSubjectName}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border-2 border-school-line bg-white px-3 py-1 text-sm font-semibold text-school-inkmuted hover:bg-school-cream"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-6">
              {isLocked && (
                <div
                  className={[
                    'rounded-2xl border-2 px-4 py-3 text-sm font-semibold',
                    editingBlocked
                      ? 'border-school-mango/40 bg-school-mango/10 text-[#92400E]'
                      : 'border-school-sky/40 bg-school-sky/10 text-school-skydeep',
                  ].join(' ')}
                >
                  🔒 Période clôturée —{' '}
                  {editingBlocked ? 'saisie verrouillée.' : 'enregistrement autorisé.'}
                </div>
              )}

              <section className="rounded-2xl border-2 border-school-line bg-white p-4">
                <SectionTitle
                  emoji="📘"
                  title="Matière et barème"
                  hint="Note maximale et coefficient appliqués à toute la classe."
                  iconClassName="bg-school-sky/20 text-school-skydeep"
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-sm sm:col-span-1">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                      Matière *
                    </span>
                    <SearchSelect
                      value={subjectId || null}
                      onChange={(v) => setSubjectId(v ?? 0)}
                      options={subjectOptions}
                      isLoading={subjectsQ.isLoading}
                      isError={subjectsQ.isError}
                      placeholder="Rechercher une matière…"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                      Note max
                    </span>
                    <input
                      type="number"
                      value={maxScore}
                      onChange={(e) => setMaxScore(Number(e.target.value))}
                      className="school-input"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                      Coefficient
                    </span>
                    <input
                      type="number"
                      value={coefficient}
                      onChange={(e) => setCoefficient(Number(e.target.value))}
                      className="school-input"
                    />
                  </label>
                </div>
              </section>

              {loadingGrades && subjectId > 0 && (
                <LoadingState label="Chargement des notes existantes…" lines={2} />
              )}

              {!loadingGrades && subjectId > 0 && existingInModal > 0 && (
                <div className="flex items-center gap-2 rounded-2xl border-2 border-school-sky/40 bg-school-sky/10 px-4 py-3 text-sm font-semibold text-school-skydeep">
                  ✏️ <strong>{existingInModal} note(s)</strong> déjà saisies — modifiez et
                  enregistrez pour mettre à jour.
                </div>
              )}

              {error && (
                <div className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
                  ✕ {error}
                </div>
              )}
              {studentsError && (
                <ErrorState
                  error={studentsErr}
                  fallback="Impossible de charger les élèves de la classe."
                  onRetry={() => void refetchStudents()}
                />
              )}

              <section className="school-section !p-0 overflow-hidden">
                <div className="border-b-2 border-school-line px-4 py-3">
                  <SectionTitle
                    emoji="🎒"
                    title="Notes par élève"
                    hint={`${rows.length} élève(s) dans la classe`}
                    iconClassName="bg-school-leaf/20 text-school-leafdeep"
                  />
                </div>
                {!students && classId > 0 ? (
                  <div className="p-4">
                    <LoadingState label="Chargement des élèves…" lines={3} />
                  </div>
                ) : rows.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      emoji="📝"
                      title="Aucun élève à noter"
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
                  </div>
                ) : (
                  <div className="school-table-wrap !rounded-none !border-0">
                    <table className="school-table">
                      <thead>
                        <tr>
                          <th>Élève</th>
                          <th className="w-28 text-center">Note / {maxScore}</th>
                          <th>Appréciation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, idx) => (
                          <tr key={r.student_id}>
                            <td>
                              <div className="flex items-center gap-3">
                                <StudentAvatar
                                  firstName={r.first_name}
                                  lastName={r.last_name}
                                  seed={r.student_id}
                                />
                                <span className="flex flex-wrap items-center gap-1.5 font-semibold">
                                  {r.label}
                                  {r.gradeId !== null && (
                                    <span className="school-badge-purple text-[10px]">
                                      existante
                                    </span>
                                  )}
                                </span>
                              </div>
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
                                className={`school-input mx-auto w-24 !py-1.5 text-center font-bold ${scoreTone(r.score, maxScore)}`}
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
                                placeholder="Appréciation (optionnel)…"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-b-3xl border-t-2 border-school-line bg-white px-6 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
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
