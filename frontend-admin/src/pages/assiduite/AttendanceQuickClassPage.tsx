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

      <div className="rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="px-4 py-3">Élève</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Retard (min)</th>
              <th className="px-4 py-3">Remarques</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={4}>
                  Sélectionnez une année et une classe.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r.student_id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{r.label}</td>
                  <td className="px-4 py-3">
                    <select
                      value={r.status}
                      onChange={(e) => {
                        const status = e.target.value as attendanceApi.AttendanceStatus
                        setRows((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  status,
                                  minutes_late: status === 'late' ? x.minutes_late : 0,
                                }
                              : x
                          )
                        )
                      }}
                      className="w-full rounded border border-slate-300 px-2 py-1"
                    >
                      <option value="present">Présent</option>
                      <option value="absent">Absent</option>
                      <option value="late">Retard</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      max={600}
                      value={r.minutes_late}
                      disabled={r.status !== 'late'}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, minutes_late: Number(e.target.value) } : x
                          )
                        )
                      }
                      className="w-28 rounded border border-slate-300 px-2 py-1 disabled:opacity-60"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={r.remarks}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, remarks: e.target.value } : x))
                        )
                      }
                      className="w-full rounded border border-slate-300 px-2 py-1"
                      placeholder="Optionnel…"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-slate-500">
        Astuce: utilisez l’écran “Absences” sur la fiche élève pour justifier.
      </div>
    </div>
  )
}

