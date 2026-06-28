import { useMutation, useQuery } from '@tanstack/react-query'
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

  const { data: existingGrades, isFetching: loadingGrades } = useQuery({
    queryKey: ['grades-existing', schoolYearId, classId, periodId, subjectId],
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
    },
    onSuccess: () => {
      setError(null)
      setShowModal(false)
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Enregistrement impossible.')),
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Saisie des notes par classe</h2>
        <p className="text-sm text-slate-500">Sélectionnez la classe, la période et la matière, puis entrez les notes de chaque élève.</p>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-xs text-slate-500">1. Année scolaire</span>
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
          <span className="text-xs text-slate-500">2. Classe</span>
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
          <span className="text-xs text-slate-500">3. Période</span>
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={!schoolYearId || !classId || !periodId}
          className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:opacity-50"
        >
          ✏️ Saisir les notes
        </button>
      </div>

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
            'flex items-center justify-between gap-3 rounded-lg border px-4 py-2 text-sm',
            editingBlocked
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-indigo-300 bg-indigo-50 text-indigo-900',
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

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
        <label className="block text-sm md:col-span-1">
          <span className="text-xs text-slate-500">Matière *</span>
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
          <span className="text-xs text-slate-500">Note max</span>
          <input
            type="number"
            value={maxScore}
            onChange={(e) => setMaxScore(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Coefficient</span>
          <input
            type="number"
            value={coefficient}
            onChange={(e) => setCoefficient(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      {loadingGrades && subjectId > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          <span className="animate-spin">⏳</span> Chargement des notes existantes…
        </div>
      )}

      {!loadingGrades && subjectId > 0 && rows.some((r) => r.gradeId !== null) && (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-800">
          ✏️ <strong>{rows.filter((r) => r.gradeId !== null).length} note(s)</strong> déjà saisies — pré-remplies ci-dessous. Modifiez et enregistrez pour mettre à jour.
        </div>
      )}

      {error && <ErrorState title="Échec d’enregistrement" fallback={error} />}
      {studentsError && (
        <ErrorState
          error={studentsErr}
          fallback="Impossible de charger les élèves de la classe."
          onRetry={() => void refetchStudents()}
        />
      )}

      <div className="rounded-lg border border-slate-200 bg-white">
        {!students && classId > 0 ? (
          <LoadingState label="Chargement des élèves…" lines={3} />
        ) : null}
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="px-4 py-3">Élève</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Appréciation</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={3}>
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
                <tr key={r.student_id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      {r.label}
                      {r.gradeId !== null && (
                        <span className="rounded bg-indigo-100 px-1 py-0.5 text-[10px] font-bold uppercase text-indigo-600">
                          existante
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
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
                      className="w-28 rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-4 py-3">
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
                      className="w-full rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
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
        <span className="text-xs text-slate-500">
          {rows.length} élève{rows.length > 1 ? 's' : ''}
          {subjectId > 0 ? ` · Matière sélectionnée` : ' · Sélectionnez une matière'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="rounded-xl border-2 border-school-line px-4 py-2 text-sm font-semibold text-school-inkmuted hover:bg-school-cream"
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
            className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
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

