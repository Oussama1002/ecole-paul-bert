import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import * as attendanceApi from '../../api/attendance'
import * as classesApi from '../../api/classes'
import * as schoolYearsApi from '../../api/schoolYears'
import * as studentsApi from '../../api/students'
import * as subjectsApi from '../../api/subjects'
import { SearchSelect } from '../../components/ui/SearchSelect'

type Row = {
  student_id: number
  label: string
  initials: string
  status: attendanceApi.AttendanceStatus
  minutes_late: number
  remarks: string
}

const STATUS_CONFIG = {
  present: {
    label: 'Présent',
    icon: '✓',
    activeClass: 'border-school-leaf bg-school-leaf/15 text-school-leafdeep',
    pillClass: 'bg-school-leaf/15 text-school-leafdeep',
    dot: 'bg-school-leafdeep',
  },
  late: {
    label: 'Retard',
    icon: '⏰',
    activeClass: 'border-school-mango bg-school-mango/15 text-[#92400E]',
    pillClass: 'bg-school-mango/15 text-[#92400E]',
    dot: 'bg-school-mango',
  },
  absent: {
    label: 'Absent',
    icon: '✕',
    activeClass: 'border-school-coral bg-school-coral/15 text-[#B23A2E]',
    pillClass: 'bg-school-coral/15 text-[#B23A2E]',
    dot: 'bg-school-coral',
  },
} as const

export function AttendanceQuickClassPage() {
  const queryClient = useQueryClient()
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [classId, setClassId] = useState<number>(0)
  const [subjectId, setSubjectId] = useState<number>(0)
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  const yearOptions = useMemo(
    () => (years?.items ?? []).map((y) => ({
      value: y.id,
      label: y.name,
      hint: y.is_current ? 'En cours' : undefined,
    })),
    [years?.items]
  )

  const classOptions = useMemo(
    () => (classes?.items ?? []).map((c) => ({
      value: c.id,
      label: c.name,
      hint: c.code,
    })),
    [classes?.items]
  )

  const subjectOptions = useMemo(
    () => [
      { value: 0, label: 'Toutes les matières' },
      ...(subjects?.items ?? []).map((s) => ({
        value: s.id,
        label: s.name,
        hint: s.code,
      })),
    ],
    [subjects?.items]
  )

  const initialRows = useMemo<Row[]>(() => {
    const items = students?.items ?? []
    return items.map((s) => ({
      student_id: s.id,
      label: `${s.last_name} ${s.first_name}`,
      initials: `${(s.last_name?.[0] ?? '').toUpperCase()}${(s.first_name?.[0] ?? '').toUpperCase()}`,
      status: 'present' as const,
      minutes_late: 0,
      remarks: '',
    }))
  }, [students?.items])

  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    setRows(initialRows)
    setError(null)
    setSuccess(null)
  }, [initialRows, classId, schoolYearId])

  const counts = useMemo(() => ({
    present: rows.filter((r) => r.status === 'present').length,
    late: rows.filter((r) => r.status === 'late').length,
    absent: rows.filter((r) => r.status === 'absent').length,
    total: rows.length,
  }), [rows])

  const bulk = useMutation({
    mutationFn: async () => {
      setError(null)
      setSuccess(null)
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
    onSuccess: () => {
      setSuccess(`Présences enregistrées pour ${counts.total} élève(s).`)
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: (e: Error) => { setError(e.message); setSuccess(null) },
  })

  const setAll = (status: attendanceApi.AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        status,
        minutes_late: status === 'late' ? (r.minutes_late || 5) : 0,
      }))
    )
    setSuccess(null)
  }

  const selectedClassName = classes?.items.find((c) => c.id === classId)?.name

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <h2 className="font-display text-xl font-bold text-school-ink">Marquage rapide</h2>
        <p className="text-sm text-school-inkmuted">Saisie en masse par classe (présent / absent / retard).</p>
      </div>

      {/* ── Filters ── */}
      <div className="school-section">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="text-xs font-bold text-school-inkmuted">Année scolaire</span>
            <div className="mt-1">
              <SearchSelect
                value={schoolYearId || null}
                onChange={(v) => { setSchoolYearId(v ?? 0); setClassId(0) }}
                options={yearOptions}
                placeholder="Choisir…"
              />
            </div>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-bold text-school-inkmuted">Classe</span>
            <div className="mt-1">
              <SearchSelect
                value={classId || null}
                onChange={(v) => setClassId(v ?? 0)}
                options={classOptions}
                disabled={!schoolYearId}
                placeholder={schoolYearId ? 'Choisir…' : "Année d'abord"}
              />
            </div>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-bold text-school-inkmuted">Matière (optionnel)</span>
            <div className="mt-1">
              <SearchSelect
                value={subjectId || null}
                onChange={(v) => setSubjectId(v ?? 0)}
                options={subjectOptions}
                placeholder="Toutes les matières"
              />
            </div>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-bold text-school-inkmuted">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="school-input mt-1"
            />
          </label>
        </div>
      </div>

      {/* ── Feedback ── */}
      {error && (
        <div className="rounded-2xl border-2 border-school-coral/30 bg-school-coral/5 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border-2 border-school-leaf/30 bg-school-leaf/5 px-4 py-3 text-sm font-semibold text-school-leafdeep">
          ✅ {success}
        </div>
      )}

      {/* ── Empty State ── */}
      {rows.length === 0 && (
        <div className="school-empty">
          <span className="school-empty-emoji">🎒</span>
          <p className="school-empty-title">Aucun élève à afficher</p>
          <p className="school-empty-hint">Sélectionnez une année et une classe pour commencer le marquage.</p>
        </div>
      )}

      {/* ── Students List ── */}
      {rows.length > 0 && (
        <>
          {/* Quick actions + Stats bar */}
          <div className="school-section !p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold text-school-inkmuted">Actions rapides :</span>
              <button
                type="button"
                onClick={() => setAll('present')}
                className="school-toggle-on !min-h-[36px] !min-w-0 !rounded-full !px-3 !py-1 !text-xs"
              >
                ✓ Tout présent
              </button>
              <button
                type="button"
                onClick={() => setAll('absent')}
                className="school-toggle-off !min-h-[36px] !min-w-0 !rounded-full !px-3 !py-1 !text-xs"
              >
                ✕ Tout absent
              </button>
              <button
                type="button"
                onClick={() => setAll('late')}
                className="rounded-full border-2 border-school-mango bg-school-mango/15 px-3 py-1 text-xs font-bold text-[#92400E] transition active:scale-[0.98]"
              >
                ⏰ Tout retard
              </button>

              <div className="ml-auto flex items-center gap-2">
                <span className="school-pill-green">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-school-leafdeep" />
                  {counts.present}
                </span>
                <span className="school-pill-sun">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-school-mango" />
                  {counts.late}
                </span>
                <span className="school-pill-coral">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-school-coral" />
                  {counts.absent}
                </span>
                <span className="text-xs font-semibold text-school-inkmuted">
                  / {counts.total}
                </span>
              </div>
            </div>
          </div>

          {/* Student cards */}
          <div className="space-y-2">
            {rows.map((r, idx) => {
              const setStatus = (status: attendanceApi.AttendanceStatus) => {
                setRows((prev) =>
                  prev.map((x, i) =>
                    i === idx
                      ? { ...x, status, minutes_late: status === 'late' ? (x.minutes_late || 5) : 0 }
                      : x
                  )
                )
                setSuccess(null)
              }

              const cfg = STATUS_CONFIG[r.status]

              return (
                <div
                  key={r.student_id}
                  className={`rounded-2xl border-2 bg-white p-3 transition ${
                    r.status === 'present' ? 'border-school-line' :
                    r.status === 'late' ? 'border-school-mango/40' :
                    'border-school-coral/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Avatar */}
                    <div className={`school-initials rounded-full ${
                      r.status === 'present' ? 'bg-gradient-to-br from-school-leaf to-school-leafdeep' :
                      r.status === 'late' ? 'bg-gradient-to-br from-school-mango to-school-sun' :
                      'bg-gradient-to-br from-school-coral to-school-cherry'
                    }`}>
                      {r.initials}
                    </div>

                    {/* Name */}
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-school-ink">{r.label}</span>
                      <span className={`ml-2 school-pill text-[10px] ${cfg.pillClass}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>

                    {/* Status buttons */}
                    <div className="flex gap-1.5">
                      {(['present', 'late', 'absent'] as const).map((s) => {
                        const sc = STATUS_CONFIG[s]
                        const active = r.status === s
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStatus(s)}
                            className={`school-toggle !min-h-[40px] !min-w-[44px] !rounded-2xl !px-3 !py-1.5 text-xs ${
                              active ? sc.activeClass : 'border-school-line bg-white text-school-inkmuted hover:bg-school-bg'
                            }`}
                            title={sc.label}
                          >
                            <span className="text-base">{sc.icon}</span>
                            <span className="hidden sm:inline">{sc.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Late/Absent details */}
                  {r.status !== 'present' && (
                    <div className="mt-3 flex flex-wrap gap-3 border-t border-school-line/50 pt-3">
                      {r.status === 'late' && (
                        <label className="flex items-center gap-2 text-xs font-semibold text-school-inkmuted">
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
                            className="school-input w-20 !py-1 text-center"
                          />
                        </label>
                      )}
                      <input
                        value={r.remarks}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, remarks: e.target.value } : x
                            )
                          )
                        }
                        className="school-input flex-1 !py-1"
                        placeholder="Remarque (optionnel)…"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Sticky Save Bar ── */}
          <div className="school-fab">
            <div className="flex items-center gap-2 text-sm">
              <span>{selectedClassName ?? 'Classe'}</span>
              <span className="opacity-70">·</span>
              <span>{new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <span className="opacity-70">·</span>
              <span>{counts.present}✓ {counts.late}⏰ {counts.absent}✕</span>
            </div>
            <button
              type="button"
              onClick={() => bulk.mutate()}
              disabled={bulk.isPending || !schoolYearId || !classId || rows.length === 0}
              className="rounded-2xl bg-white/20 px-5 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/30 disabled:opacity-50"
            >
              {bulk.isPending ? 'Enregistrement…' : '💾 Enregistrer'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
