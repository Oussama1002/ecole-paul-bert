import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import * as attendanceApi from '../../api/attendance'
import * as classesApi from '../../api/classes'
import * as schoolYearsApi from '../../api/schoolYears'
import * as studentsApi from '../../api/students'
import * as subjectsApi from '../../api/subjects'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { StatBar } from '../../components/ui/StatBar'
import { StudentAvatar } from '../../components/ui/StudentAvatar'
import { getApiErrorMessage } from '../../utils/apiError'

type Row = {
  student_id: number
  first_name: string
  last_name: string
  label: string
  status: attendanceApi.AttendanceStatus
  minutes_late: number
  remarks: string
}

const STATUS_CONFIG = {
  present: {
    label: 'Présent',
    icon: '✓',
    activeClass: 'border-school-leaf bg-school-leaf/15 text-school-leafdeep',
    pillClass: 'school-pill-green',
    cardBorder: 'border-school-line hover:border-school-leaf/50',
  },
  late: {
    label: 'Retard',
    icon: '⏰',
    activeClass: 'border-school-mango bg-school-mango/15 text-[#92400E]',
    pillClass: 'school-pill-sun',
    cardBorder: 'border-school-mango/40 hover:border-school-mango/70',
  },
  absent: {
    label: 'Absent',
    icon: '✕',
    activeClass: 'border-school-coral bg-school-coral/15 text-[#B23A2E]',
    pillClass: 'school-pill-coral',
    cardBorder: 'border-school-coral/40 hover:border-school-coral/70',
  },
} as const

function todayDateString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function AttendanceQuickClassPage() {
  const queryClient = useQueryClient()
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [classId, setClassId] = useState<number>(0)
  const [subjectId, setSubjectId] = useState<number>(0)
  const [date, setDate] = useState<string>(() => todayDateString())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { data: subjects } = useQuery({
    queryKey: ['subjects-attendance'],
    queryFn: () =>
      subjectsApi.fetchSubjects({
        per_page: 200,
        status: 'active',
        sort_by: 'name',
        sort_order: 'asc',
      }),
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

  const { data: students, isLoading: studentsLoading } = useQuery({
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
      first_name: s.first_name,
      last_name: s.last_name,
      label: `${s.last_name} ${s.first_name}`,
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

  const counts = useMemo(
    () => ({
      present: rows.filter((r) => r.status === 'present').length,
      late: rows.filter((r) => r.status === 'late').length,
      absent: rows.filter((r) => r.status === 'absent').length,
      total: rows.length,
    }),
    [rows]
  )

  const presenceRate =
    counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0

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
    onError: (e: unknown) => {
      setError(getApiErrorMessage(e, "Impossible d'enregistrer les présences."))
      setSuccess(null)
    },
  })

  const setAll = (status: attendanceApi.AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        status,
        minutes_late: status === 'late' ? r.minutes_late || 5 : 0,
      }))
    )
    setSuccess(null)
  }

  const selectedClassName = classes?.items.find((c) => c.id === classId)?.name
  const selectedYearName = years?.items.find((y) => y.id === schoolYearId)?.name
  const selectedSubjectName =
    subjectId > 0
      ? subjects?.items.find((s) => s.id === subjectId)?.name
      : null
  const isToday = date === todayDateString()

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        emoji="📋"
        title="Marquage rapide"
        subtitle="Saisie en masse par classe — présent, absent ou en retard."
        actions={
          <button
            type="button"
            onClick={() => setDate(todayDateString())}
            className="school-btn-secondary"
          >
            Aujourd&apos;hui
          </button>
        }
      />

      {/* Context hero */}
      <div className="school-hero !from-school-leafdeep !via-school-mint !to-school-skydeep">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              Feuille de présence
            </p>
            <p className="mt-1 font-display text-xl font-bold capitalize sm:text-2xl">
              {formatDateLabel(date)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedYearName && (
                <span className="school-chip-on-dark">{selectedYearName}</span>
              )}
              {selectedClassName && (
                <span className="school-chip-on-dark">🏫 {selectedClassName}</span>
              )}
              {selectedSubjectName && (
                <span className="school-chip-on-dark">📘 {selectedSubjectName}</span>
              )}
              {isToday && (
                <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  Aujourd&apos;hui
                </span>
              )}
            </div>
          </div>
          {rows.length > 0 && (
            <div className="rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-center backdrop-blur">
              <p className="font-display text-3xl font-bold">{counts.total}</p>
              <p className="text-xs font-semibold text-white/80">élève(s)</p>
            </div>
          )}
        </div>
      </div>

      {/* KPI tiles — visible once class loaded */}
      {rows.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="school-tile school-accent-green">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  Présents
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-school-leafdeep">
                  {counts.present}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-leaf/15 text-2xl">
                ✅
              </div>
            </div>
          </div>
          <div className="school-tile school-accent-orange">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  Retards
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-[#92400E]">
                  {counts.late}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-mango/15 text-2xl">
                ⏰
              </div>
            </div>
          </div>
          <div className="school-tile school-accent-coral">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  Absents
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-[#B23A2E]">
                  {counts.absent}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-coral/15 text-2xl">
                ✕
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="school-section">
        <SectionTitle
          emoji="🔎"
          title="Sélection"
          hint="Année, classe, matière et date du marquage."
          iconClassName="bg-school-mist text-school-skydeep"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Année scolaire
            </span>
            <SearchSelect
              value={schoolYearId || null}
              onChange={(v) => {
                setSchoolYearId(v ?? 0)
                setClassId(0)
              }}
              options={yearOptions}
              placeholder="Choisir…"
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
              placeholder={schoolYearId ? 'Choisir…' : "Année d'abord"}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Matière (optionnel)
            </span>
            <SearchSelect
              value={subjectId || null}
              onChange={(v) => setSubjectId(v ?? 0)}
              options={subjectOptions}
              placeholder="Toutes les matières"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="school-input"
            />
          </label>
        </div>
      </section>

      {/* Feedback */}
      {error && (
        <div className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
          ✕ {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border-2 border-school-leaf/40 bg-school-leaf/10 px-4 py-3 text-sm font-semibold text-school-leafdeep">
          ✅ {success}
        </div>
      )}

      {/* Loading */}
      {studentsLoading && classId > 0 && (
        <LoadingState label="Chargement des élèves…" lines={4} />
      )}

      {/* Empty — no class */}
      {!studentsLoading && classId === 0 && (
        <EmptyState
          emoji="🪧"
          title="Choisissez une classe"
          hint="Sélectionnez l'année scolaire et la classe pour afficher la liste des élèves."
        />
      )}

      {/* Empty — no students */}
      {!studentsLoading && classId > 0 && rows.length === 0 && (
        <EmptyState
          emoji="👥"
          title="Aucun élève dans cette classe"
          hint="Vérifiez les inscriptions pour cette année ou choisissez une autre classe."
        />
      )}

      {/* Student list */}
      {!studentsLoading && rows.length > 0 && (
        <>
          <section className="school-section">
            <SectionTitle
              emoji="⚡"
              title="Actions rapides"
              hint={`Taux de présence : ${presenceRate}%`}
              iconClassName="bg-school-sunsoft text-[#8A6A00]"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAll('present')}
                className="school-toggle-on !min-h-[36px] !min-w-0 !rounded-full !px-4 !py-1.5 !text-xs"
              >
                ✓ Tout présent
              </button>
              <button
                type="button"
                onClick={() => setAll('absent')}
                className="school-toggle-off !min-h-[36px] !min-w-0 !rounded-full !px-4 !py-1.5 !text-xs"
              >
                ✕ Tout absent
              </button>
              <button
                type="button"
                onClick={() => setAll('late')}
                className="rounded-full border-2 border-school-mango bg-school-mango/15 px-4 py-1.5 text-xs font-bold text-[#92400E] transition hover:bg-school-mango/25 active:scale-[0.98]"
              >
                ⏰ Tout en retard
              </button>
              <div className="ml-auto hidden min-w-[200px] sm:block lg:min-w-[260px]">
                <StatBar
                  value={counts.present}
                  max={Math.max(1, counts.total)}
                  tone="leaf"
                  label={
                    <>
                      <span>Présence</span>
                      <span className="font-bold text-school-leafdeep">{presenceRate}%</span>
                    </>
                  }
                  caption={`${counts.present} présents sur ${counts.total}`}
                />
              </div>
            </div>
          </section>

          <section className="school-section">
            <SectionTitle
              emoji="🎒"
              title="Liste des élèves"
              hint="Cliquez sur un statut pour chaque élève."
              iconClassName="bg-school-sky/20 text-school-skydeep"
            />
            <div className="space-y-2">
              {rows.map((r, idx) => {
                const setStatus = (status: attendanceApi.AttendanceStatus) => {
                  setRows((prev) =>
                    prev.map((x, i) =>
                      i === idx
                        ? {
                            ...x,
                            status,
                            minutes_late: status === 'late' ? x.minutes_late || 5 : 0,
                          }
                        : x
                    )
                  )
                  setSuccess(null)
                }

                const cfg = STATUS_CONFIG[r.status]

                return (
                  <div
                    key={r.student_id}
                    className={`rounded-2xl border-2 bg-white p-3 shadow-sm transition sm:p-4 ${cfg.cardBorder}`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <StudentAvatar
                        firstName={r.first_name}
                        lastName={r.last_name}
                        seed={r.student_id}
                        size="lg"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-bold text-school-ink sm:text-base">
                          {r.label}
                        </p>
                        <span className={`mt-1 inline-flex ${cfg.pillClass}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>

                      <div className="flex w-full gap-1.5 sm:w-auto">
                        {(['present', 'late', 'absent'] as const).map((s) => {
                          const sc = STATUS_CONFIG[s]
                          const active = r.status === s
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setStatus(s)}
                              className={`school-toggle flex-1 !min-h-[44px] !min-w-0 !rounded-2xl !px-2 !py-2 text-xs sm:flex-none sm:!min-w-[72px] sm:!px-3 ${
                                active
                                  ? sc.activeClass
                                  : 'border-school-line bg-school-cream/50 text-school-inkmuted hover:bg-school-mist/50'
                              }`}
                              title={sc.label}
                            >
                              <span className="text-base leading-none">{sc.icon}</span>
                              <span className="hidden sm:inline">{sc.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {r.status !== 'present' && (
                      <div className="mt-3 flex flex-wrap gap-3 border-t-2 border-school-line/50 pt-3">
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
                                    i === idx
                                      ? { ...x, minutes_late: Number(e.target.value) }
                                      : x
                                  )
                                )
                              }
                              className="school-input w-20 !py-1.5 text-center"
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
                          className="school-input min-w-[200px] flex-1 !py-1.5"
                          placeholder="Remarque (optionnel)…"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Sticky save bar */}
          <div className="school-fab">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-bold">{selectedClassName ?? 'Classe'}</span>
              <span className="opacity-70">·</span>
              <span className="capitalize">
                {new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <span className="opacity-70">·</span>
              <span>
                <span className="text-school-leafdeep">{counts.present}✓</span>{' '}
                <span className="text-school-mango">{counts.late}⏰</span>{' '}
                <span className="text-school-coral">{counts.absent}✕</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => bulk.mutate()}
              disabled={bulk.isPending || !schoolYearId || !classId || rows.length === 0}
              className="rounded-2xl bg-white/20 px-5 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/30 disabled:opacity-50"
            >
              {bulk.isPending ? 'Enregistrement…' : '💾 Enregistrer'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
