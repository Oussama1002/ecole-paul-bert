import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import * as attendanceApi from '../../api/attendance'
import * as classesApi from '../../api/classes'
import * as schoolYearsApi from '../../api/schoolYears'
import * as studentsApi from '../../api/students'
import * as subjectsApi from '../../api/subjects'

type Row = {
  student_id: number
  label: string
  status: attendanceApi.AttendanceStatus
  minutes_late: number
  remarks: string
}

export function AttendanceQuickClassPage() {
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [classId, setClassId] = useState<number>(0)
  const [subjectId, setSubjectId] = useState<number>(0)
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  const { data: subjects } = useQuery({
    queryKey: ['subjects-attendance'],
    queryFn: () => subjectsApi.fetchSubjects({ per_page: 200, status: 'active', sort_by: 'name', sort_order: 'asc' }),
  })

  const { data: years } = useQuery({
    queryKey: ['school-years-attendance'],
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
    queryKey: ['classes-attendance', schoolYearId],
    queryFn: () =>
      classesApi.fetchClasses({
        per_page: 100,
        school_year_id: schoolYearId,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
  })

  const { data: students } = useQuery({
    queryKey: ['students-attendance', schoolYearId, classId],
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

  const initialRows = useMemo<Row[]>(() => {
    const items = students?.items ?? []
    return items.map((s) => ({
      student_id: s.id,
      label: `${s.last_name} ${s.first_name}`,
      status: 'present',
      minutes_late: 0,
      remarks: '',
    }))
  }, [students?.items])

  const [rows, setRows] = useState<Row[]>([])

  // reset rows whenever student list changes
  useEffect(() => {
    setRows(initialRows)
    setError(null)
  }, [initialRows, classId, schoolYearId])

  const bulk = useMutation({
    mutationFn: async () => {
      setError(null)
      if (!schoolYearId || !classId) {
        throw new Error('Sélectionnez année et classe.')
      }
      const payload: attendanceApi.BulkMarkPayload = {
        school_year_id: schoolYearId,
        attendance_date: date,
        subject_id: subjectId || null,
        items: rows.map((r) => ({
          student_id: r.student_id,
          attendance_status: r.status,
          minutes_late: r.status === 'late' ? r.minutes_late : null,
          remarks: r.remarks?.trim() ? r.remarks.trim() : null,
        })),
      }
      await attendanceApi.bulkMarkAttendance(classId, payload)
    },
    onError: (e: Error) => setError(e.message),
  })

  const setAll = (status: attendanceApi.AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        status,
        minutes_late: status === 'late' ? r.minutes_late : 0,
      }))
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Marquage rapide</h2>
        <p className="text-sm text-slate-500">Saisie en masse par classe (présent/absent/retard).</p>
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
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-xs text-slate-500">Matière</span>
          <select
            value={subjectId || ''}
            onChange={(e) => setSubjectId(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">— Toutes —</option>
            {subjects?.items.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-xs text-slate-500">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAll('present')}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          Tout présent
        </button>
        <button
          type="button"
          onClick={() => setAll('absent')}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          Tout absent
        </button>
        <button
          type="button"
          onClick={() => setAll('late')}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          Tout en retard
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => bulk.mutate()}
          disabled={bulk.isPending || !schoolYearId || !classId || rows.length === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          Enregistrer
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          🎒 Sélectionnez une année et une classe pour afficher les élèves.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-3xl border-2 border-school-line bg-white px-4 py-3 shadow-sm">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              ✓ {rows.filter((r) => r.status === 'present').length} présents
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              ⏰ {rows.filter((r) => r.status === 'late').length} retards
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
              ✕ {rows.filter((r) => r.status === 'absent').length} absents
            </span>
            <span className="ml-auto text-xs text-slate-500">{rows.length} élèves au total</span>
          </div>

          <div className="space-y-2">
            {rows.map((r, idx) => {
              const setStatus = (status: attendanceApi.AttendanceStatus) =>
                setRows((prev) =>
                  prev.map((x, i) =>
                    i === idx
                      ? { ...x, status, minutes_late: status === 'late' ? x.minutes_late || 5 : 0 }
                      : x
                  )
                )
              const statusBtn = (
                v: attendanceApi.AttendanceStatus,
                label: string,
                emoji: string,
                onClasses: string
              ) => (
                <button
                  type="button"
                  onClick={() => setStatus(v)}
                  className={[
                    'flex-1 rounded-xl px-3 py-2 text-sm font-bold transition',
                    r.status === v
                      ? onClasses + ' shadow'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  ].join(' ')}
                >
                  {emoji} {label}
                </button>
              )
              return (
                <div
                  key={r.student_id}
                  className="rounded-2xl border-2 border-school-line bg-white p-3 shadow-sm transition hover:shadow"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-school-bubblegum to-school-grape text-sm font-bold text-white">
                      {r.label
                        .split(' ')
                        .slice(0, 2)
                        .map((s) => s[0] ?? '')
                        .join('')
                        .toUpperCase()}
                    </div>
                    <span className="flex-1 font-semibold text-slate-800">{r.label}</span>
                    <div className="flex w-full gap-2 sm:w-auto">
                      {statusBtn('present', 'Présent', '✓', 'bg-emerald-500 text-white')}
                      {statusBtn('late', 'Retard', '⏰', 'bg-amber-500 text-white')}
                      {statusBtn('absent', 'Absent', '✕', 'bg-red-500 text-white')}
                    </div>
                  </div>
                  {r.status === 'late' && (
                    <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        Retard (min)
                        <input
                          type="number"
                          min={0}
                          max={600}
                          value={r.minutes_late}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, minutes_late: Number(e.target.value) } : x
                              )
                            )
                          }
                          className="w-20 rounded border border-slate-300 px-2 py-1"
                        />
                      </label>
                      <input
                        value={r.remarks}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, remarks: e.target.value } : x
                            )
                          )
                        }
                        className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                        placeholder="Remarque (optionnel)…"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="sticky bottom-3 z-10 mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => bulk.mutate()}
              disabled={bulk.isPending || !schoolYearId || !classId || rows.length === 0}
              className="rounded-2xl bg-indigo-600 px-8 py-3 text-base font-bold text-white shadow-lg hover:bg-indigo-700 disabled:opacity-60"
            >
              {bulk.isPending ? 'Enregistrement…' : '💾 Enregistrer les présences'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

