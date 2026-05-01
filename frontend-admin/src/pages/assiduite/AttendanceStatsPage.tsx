import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import * as attendanceApi from '../../api/attendance'
import * as classesApi from '../../api/classes'
import * as schoolYearsApi from '../../api/schoolYears'

export function AttendanceStatsPage() {
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [classId, setClassId] = useState<number>(0)
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')

  const { data: years } = useQuery({
    queryKey: ['school-years-attendance-stats'],
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
    queryKey: ['classes-attendance-stats', schoolYearId],
    queryFn: () =>
      classesApi.fetchClasses({
        per_page: 100,
        school_year_id: schoolYearId,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['attendance-stats', schoolYearId, classId, from, to],
    queryFn: () =>
      attendanceApi.fetchAttendanceStats({
        school_year_id: schoolYearId,
        class_id: classId || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: schoolYearId > 0,
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Statistiques absences</h2>
        <p className="text-sm text-slate-500">Synthèse par année/classe/période.</p>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Année scolaire</span>
          <select
            value={schoolYearId || ''}
            onChange={(e) => {
              setSchoolYearId(Number(e.target.value))
              setClassId(0)
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
          <span className="text-xs text-slate-500">Classe (optionnel)</span>
          <select
            value={classId || ''}
            onChange={(e) => setClassId(Number(e.target.value))}
            disabled={!schoolYearId}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 disabled:opacity-60"
          >
            <option value="">Toutes</option>
            {classes?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-xs text-slate-500">Du</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-xs text-slate-500">Au</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Chargement…</p>}
      {isError && <p className="text-sm text-red-600">{(error as Error).message}</p>}

      {data && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Absences</p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">{data.absent}</p>
            <p className="mt-1 text-sm text-slate-500">
              Justifiées: {data.absent_justified} — Non justifiées: {data.absent_unjustified}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Retards</p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">{data.late}</p>
            <p className="mt-1 text-sm text-slate-500">
              Minutes cumulées: {data.late_minutes_total}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Présences</p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">{data.present}</p>
            <p className="mt-1 text-sm text-slate-500">Total enregistrements: {data.total}</p>
          </div>
        </div>
      )}
    </div>
  )
}

