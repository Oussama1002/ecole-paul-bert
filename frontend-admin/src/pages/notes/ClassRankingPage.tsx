import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import * as classesApi from '../../api/classes'
import * as evaluationPeriodsApi from '../../api/evaluationPeriods'
import * as gradesApi from '../../api/grades'
import * as schoolYearsApi from '../../api/schoolYears'

export function ClassRankingPage() {
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [classId, setClassId] = useState<number>(0)
  const [periodId, setPeriodId] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const { data: years } = useQuery({
    queryKey: ['school-years-ranking'],
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
    queryKey: ['classes-ranking', schoolYearId],
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
    queryKey: ['periods-ranking', schoolYearId],
    queryFn: () =>
      evaluationPeriodsApi.fetchEvaluationPeriods({
        per_page: 100,
        school_year_id: schoolYearId,
        sort_by: 'sort_order',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['class-ranking', schoolYearId, classId, periodId],
    queryFn: () =>
      gradesApi.fetchClassRanking({
        school_year_id: schoolYearId,
        class_id: classId,
        evaluation_period_id: periodId,
      }),
    enabled: schoolYearId > 0 && classId > 0 && periodId > 0,
  })

  const recalc = useMutation({
    mutationFn: async () => {
      setError(null)
      if (!schoolYearId || !periodId) throw new Error('Sélectionnez année + période.')
      await gradesApi.recalculateGrades({
        school_year_id: schoolYearId,
        evaluation_period_id: periodId,
        class_id: classId || undefined,
      })
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-800">Classement</h2>
          <p className="text-sm text-slate-500">Moyenne période + rang (ex-aequo gérés).</p>
        </div>
        <button
          type="button"
          onClick={() => recalc.mutate()}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          Recalculer
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Année scolaire</span>
          <select
            value={schoolYearId || ''}
            onChange={(e) => {
              setSchoolYearId(Number(e.target.value))
              setClassId(0)
              setPeriodId(0)
            }}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">—</option>
            {years?.items.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-xs text-slate-500">Classe</span>
          <select
            value={classId || ''}
            onChange={(e) => setClassId(Number(e.target.value))}
            disabled={!schoolYearId}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 disabled:opacity-60"
          >
            <option value="">—</option>
            {classes?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-xs text-slate-500">Période</span>
          <select
            value={periodId || ''}
            onChange={(e) => setPeriodId(Number(e.target.value))}
            disabled={!schoolYearId}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 disabled:opacity-60"
          >
            <option value="">—</option>
            {periods?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Chargement…</p>}

      {data && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500">
            Stratégie rang: <b className="text-slate-700">{data.ranking_strategy}</b>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-4 py-3">Rang</th>
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Moyenne</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.student.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{it.rank ?? '—'}</td>
                  <td className="px-4 py-3">
                    {it.student.last_name} {it.student.first_name}{' '}
                    <span className="font-mono text-xs text-slate-500">
                      ({it.student.student_code})
                    </span>
                  </td>
                  <td className="px-4 py-3">{it.period_average ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

