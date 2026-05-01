import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import * as attendanceApi from '../../api/attendance'
import * as classesApi from '../../api/classes'
import * as schoolYearsApi from '../../api/schoolYears'
import * as simpleApi from '../../api/simpleAttendance'
import * as studentsApi from '../../api/students'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { StatBar } from '../../components/ui/StatBar'
import { StudentAvatar } from '../../components/ui/StudentAvatar'
import { getApiErrorMessage } from '../../utils/apiError'

/**
 * Simple-mode attendance — élèves uniquement.
 *
 * Tablet-first: each row has a big "Présent / Absent" two-state toggle, a
 * sticky summary FAB at the bottom shows how many absents are pending and
 * submits the whole classroom in one tap.
 *
 * La marque des enseignants reste dans le mode avancé (écran dédié / RH).
 */
export function SimpleAttendancePage() {
  const [tab, setTab] = useState<'students' | 'teachers'>('students')
  return (
    <div className="space-y-5">
      <PageHeader
        emoji="✅"
        title="Présences du jour"
        subtitle="Par classe : marquer les présents. Les autres sont notés absents."
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('students')}
          className={
            tab === 'students'
              ? 'school-tab-pill school-tab-pill-active'
              : 'school-tab-pill school-tab-pill-idle'
          }
        >
          👧 Élèves
        </button>
        <button
          type="button"
          onClick={() => setTab('teachers')}
          className={
            tab === 'teachers'
              ? 'school-tab-pill school-tab-pill-active'
              : 'school-tab-pill school-tab-pill-idle'
          }
        >
          👩‍🏫 Enseignants
        </button>
      </div>

      {tab === 'students' ? <StudentsPanel /> : <TeachersPanel />}
    </div>
  )
}

/* ───────────────────────────── STUDENTS ───────────────────────────── */

function StudentsPanel() {
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [classId, setClassId] = useState<number>(0)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [present, setPresent] = useState<Record<number, boolean>>({})
  const [flash, setFlash] = useState<string | null>(null)

  const { data: years, isLoading: yearsLoading, isError: yearsError, error: yearsErr, refetch: refetchYears } =
    useQuery({
    queryKey: ['simple-att-years'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 50,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
  })

  useEffect(() => {
    if (!schoolYearId && years?.items.length) {
      const current = years.items.find((y) => y.is_current) ?? years.items[0]
      setSchoolYearId(current.id)
    }
  }, [years, schoolYearId])

  const { data: classes, refetch: refetchClasses } = useQuery({
    queryKey: ['simple-att-classes', schoolYearId],
    queryFn: () =>
      classesApi.fetchClasses({
        per_page: 100,
        school_year_id: schoolYearId,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
  })

  const { data: students, isLoading, refetch: refetchStudents } = useQuery({
    queryKey: ['simple-att-students', schoolYearId, classId],
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

  useEffect(() => {
    if (!students) return
    const next: Record<number, boolean> = {}
    for (const s of students.items) next[s.id] = true
    setPresent(next)
  }, [students])

  const month = date.slice(0, 7)
  const { data: monthlyTotals, refetch: refetchMonthlyTotals } = useQuery({
    queryKey: ['simple-att-stu-month', classId, month],
    queryFn: () => simpleApi.fetchStudentMonthlyTotals({ class_id: classId, month }),
    enabled: classId > 0,
  })

  const save = useMutation({
    mutationFn: async () => {
      if (!schoolYearId || !classId) {
        throw new Error("Choisissez l'année et la classe avant d'enregistrer.")
      }
      const items = (students?.items ?? []).map((s) => ({
        student_id: s.id,
        attendance_status: (present[s.id]
          ? 'present'
          : 'absent') as attendanceApi.AttendanceStatus,
      }))
      await attendanceApi.bulkMarkAttendance(classId, {
        school_year_id: schoolYearId,
        attendance_date: date,
        items,
      })
    },
    onSuccess: () => {
      setFlash('Présences enregistrées.')
      setTimeout(() => setFlash(null), 2500)
    },
  })

  const absentCount = useMemo(
    () => Object.values(present).filter((v) => !v).length,
    [present]
  )
  const presentCount = useMemo(
    () => Object.values(present).filter((v) => v).length,
    [present]
  )

  const markAllPresent = () => {
    if (!students) return
    const next: Record<number, boolean> = {}
    for (const s of students.items) next[s.id] = true
    setPresent(next)
  }

  return (
    <div className="space-y-4 pb-20">
      <section className="school-section">
        <SectionTitle
          emoji="🧭"
          title="Sélection de la journée"
          hint="Choisissez la classe et la date avant de cocher les présences."
          iconClassName="bg-school-sunsoft text-[#8A6A00]"
        />
      </section>
      <section className="school-section grid gap-3 sm:grid-cols-4">
        <Field label="Année">
          <select
            value={schoolYearId}
            onChange={(e) => setSchoolYearId(parseInt(e.target.value, 10))}
            className="school-select"
            disabled={yearsLoading}
          >
            <option value={0}>{yearsLoading ? 'Chargement…' : '—'}</option>
            {years?.items.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Classe">
          <select
            value={classId}
            onChange={(e) => setClassId(parseInt(e.target.value, 10))}
            className="school-select"
          >
            <option value={0}>—</option>
            {classes?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <div className="space-y-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="school-input"
            />
            <div className="flex flex-wrap gap-1.5">
              <DateShortcut value={date} onChange={setDate} />
            </div>
          </div>
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            onClick={markAllPresent}
            disabled={!classId}
            className="school-btn-secondary w-full disabled:opacity-50"
          >
            Tout le monde présent
          </button>
        </div>
      </section>

      {classId > 0 && (
        <section className="school-section">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="school-pill-green">✓ {presentCount} présents</span>
              <span className="school-pill-coral">✕ {absentCount} absents</span>
              <span className="school-pill-muted capitalize">
                {new Date(date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>
            <div className="min-w-[180px] flex-1 sm:max-w-xs">
              <StatBar
                value={presentCount}
                max={Math.max(1, presentCount + absentCount)}
                tone="leaf"
                label={
                  <>
                    <span>Taux de présence</span>
                    <span className="font-bold text-school-leafdeep">
                      {Math.round(
                        (presentCount /
                          Math.max(1, presentCount + absentCount)) *
                          100
                      )}
                      %
                    </span>
                  </>
                }
              />
            </div>
          </div>
        </section>
      )}

      {flash && (
        <div className="rounded-2xl border-2 border-school-leaf/40 bg-school-leaf/10 px-4 py-2.5 text-sm font-semibold text-school-leafdeep">
          {flash}
        </div>
      )}
      {yearsError && (
        <ErrorState
          error={yearsErr}
          fallback="Impossible de charger les années scolaires."
          onRetry={() => void refetchYears()}
        />
      )}

      {save.isError && (
        <ErrorState
          error={save.error}
          fallback="Impossible d'enregistrer les présences."
          onRetry={() => {
            save.reset()
            save.mutate()
          }}
        />
      )}

      {!isLoading && classId === 0 && (
        <EmptyState
          emoji="🪧"
          title="Choisissez une classe"
          hint="Sélectionnez l'année et la classe pour afficher la liste des élèves à cocher."
          action={
            <button type="button" onClick={() => void refetchClasses()} className="school-btn-secondary">
              Actualiser les classes
            </button>
          }
        />
      )}

      {!isLoading && classId > 0 && (students?.items.length ?? 0) === 0 && (
        <EmptyState
          emoji="👥"
          title="Aucun élève dans cette classe"
          hint="Vérifiez l'inscription des élèves pour cette année, ou choisissez une autre classe."
          action={
            <button
              type="button"
              onClick={() => {
                void refetchStudents()
                void refetchMonthlyTotals()
              }}
              className="school-btn-secondary"
            >
              Réessayer
            </button>
          }
        />
      )}

      {(isLoading ||
        (classId > 0 && (students?.items.length ?? 0) > 0)) && (
      <div className="space-y-3">
      {isLoading ? <LoadingState label="Chargement de la grille de présence…" lines={3} /> : null}
      <div className="school-table-wrap">
        <table className="school-table">
          <thead>
            <tr>
              <th>Élève</th>
              <th className="text-center">Présence</th>
              <th className="text-right" title="Total des absences du mois, calculé depuis les feuilles quotidiennes">Abs. ce mois</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-school-inkmuted">
                  Chargement…
                </td>
              </tr>
            )}
            {!isLoading &&
              classId > 0 &&
              (students?.items ?? []).map((s) => {
                const isPresent = present[s.id] ?? true
                const t = monthlyTotals?.totals.find((x) => x.student_id === s.id)
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <StudentAvatar
                          firstName={s.first_name}
                          lastName={s.last_name}
                          seed={s.id}
                        />
                        <span className="font-semibold">
                          {s.last_name} {s.first_name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPresent((p) => ({ ...p, [s.id]: true }))
                          }
                          className={
                            isPresent ? 'school-toggle-on' : 'school-toggle-idle'
                          }
                        >
                          ✓ Présent
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPresent((p) => ({ ...p, [s.id]: false }))
                          }
                          className={
                            !isPresent ? 'school-toggle-off' : 'school-toggle-idle'
                          }
                        >
                          ✕ Absent
                        </button>
                      </div>
                    </td>
                    <td className="text-right">
                      <span
                        className={
                          (t?.absent ?? 0) > 0
                            ? 'school-pill-coral'
                            : 'school-pill-muted'
                        }
                      >
                        {t?.absent ?? 0}
                      </span>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
      </div>
      )}

      {classId > 0 && (students?.items.length ?? 0) > 0 && (
        <div className="school-fab">
          <span className="truncate">
            {absentCount} absent{absentCount > 1 ? 's' : ''} · {presentCount} présents
          </span>
          <button
            type="button"
            disabled={save.isPending || yearsLoading || !schoolYearId || !classId}
            onClick={() => {
              save.reset()
              save.mutate()
            }}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-school-grape shadow transition hover:bg-school-cream disabled:opacity-60"
          >
            {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────────── TEACHERS ───────────────────────────── */

function TeachersPanel() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [present, setPresent] = useState<Record<number, boolean>>({})
  const [flash, setFlash] = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const month = date.slice(0, 7)

  const { data: roster, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['simple-att-teachers-day', date],
    queryFn: () => simpleApi.fetchTeacherDayRoster(date),
  })

  const { data: monthly, refetch: refetchMonthly } = useQuery({
    queryKey: ['simple-att-teachers-month', month],
    queryFn: () => simpleApi.fetchTeacherMonthly(month),
  })

  useEffect(() => {
    if (!roster) return
    const next: Record<number, boolean> = {}
    for (const t of roster.teachers) {
      next[t.teacher_id] = t.status == null ? true : t.status === 'present'
    }
    setPresent(next)
  }, [roster])

  const presentCount = useMemo(
    () => Object.values(present).filter(Boolean).length,
    [present]
  )
  const absentCount = useMemo(
    () => Object.values(present).filter((v) => !v).length,
    [present]
  )

  const save = useMutation({
    mutationFn: async () => {
      setErrMsg(null)
      const list = roster?.teachers ?? []
      for (const t of list) {
        const status: simpleApi.SimpleAttendanceStatus = present[t.teacher_id]
          ? 'present'
          : 'absent'
        await simpleApi.upsertTeacherAttendance({
          teacher_id: t.teacher_id,
          attendance_date: date,
          status,
        })
      }
    },
    onSuccess: () => {
      setFlash('Présences enseignants enregistrées.')
      setTimeout(() => setFlash(null), 2500)
      refetchMonthly()
    },
    onError: (e) =>
      setErrMsg(getApiErrorMessage(e, "Impossible d'enregistrer les présences.")),
  })

  const markAllPresent = () => {
    if (!roster) return
    const next: Record<number, boolean> = {}
    for (const t of roster.teachers) next[t.teacher_id] = true
    setPresent(next)
  }

  return (
    <div className="space-y-4 pb-20">
      <section className="school-section">
        <SectionTitle
          emoji="🧭"
          title="Sélection de la journée"
          hint="Date du jour et marquage rapide des enseignants."
          iconClassName="bg-school-sunsoft text-[#8A6A00]"
        />
      </section>
      <section className="school-section grid gap-3 sm:grid-cols-3">
        <Field label="Date">
          <div className="space-y-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="school-input"
            />
            <div className="flex flex-wrap gap-1.5">
              <DateShortcut value={date} onChange={setDate} />
            </div>
          </div>
        </Field>
        <Field label="Mois (totaux)">
          <input value={month} readOnly className="school-input bg-school-cream/40" />
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            onClick={markAllPresent}
            className="school-btn-secondary w-full"
          >
            Tous présents
          </button>
        </div>
      </section>

      <section className="school-section">
        <div className="flex flex-wrap gap-2">
          <span className="school-pill-green">✓ {presentCount} présents</span>
          <span className="school-pill-coral">✕ {absentCount} absents</span>
          <span className="school-pill-muted capitalize">
            {new Date(date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
        </div>
      </section>

      {flash && (
        <div className="rounded-2xl border-2 border-school-leaf/40 bg-school-leaf/10 px-4 py-2.5 text-sm font-semibold text-school-leafdeep">
          {flash}
        </div>
      )}
      {errMsg && (
        <ErrorState title="Échec d’enregistrement" fallback={errMsg} />
      )}
      {isError && (
        <ErrorState
          error={error}
          fallback="Impossible de charger les présences enseignants."
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && (roster?.teachers.length ?? 0) === 0 && (
        <EmptyState
          emoji="👩‍🏫"
          title="Aucun enseignant"
          hint="Ajoutez des enseignants pour pouvoir marquer leur présence."
          action={
            <button type="button" onClick={() => void refetch()} className="school-btn-secondary">
              Réessayer
            </button>
          }
        />
      )}

      {(isLoading || (roster?.teachers.length ?? 0) > 0) && (
        <div className="space-y-3">
          {isLoading ? <LoadingState label="Chargement des enseignants…" lines={3} /> : null}
        <div className="school-table-wrap">
          <table className="school-table">
            <thead>
              <tr>
                <th>Enseignant</th>
                <th className="text-center">Présence</th>
                <th className="text-right">Abs. ce mois</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-school-inkmuted">
                    Chargement…
                  </td>
                </tr>
              )}
              {!isLoading &&
                (roster?.teachers ?? []).map((t) => {
                  const isPresent = present[t.teacher_id] ?? true
                  const tot = monthly?.totals.find(
                    (x) => x.teacher_id === t.teacher_id
                  )
                  return (
                    <tr key={t.teacher_id}>
                      <td>
                        <span className="font-semibold">
                          {t.last_name} {t.first_name}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPresent((p) => ({ ...p, [t.teacher_id]: true }))
                            }
                            className={
                              isPresent ? 'school-toggle-on' : 'school-toggle-idle'
                            }
                          >
                            ✓ Présent
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPresent((p) => ({ ...p, [t.teacher_id]: false }))
                            }
                            className={
                              !isPresent ? 'school-toggle-off' : 'school-toggle-idle'
                            }
                          >
                            ✕ Absent
                          </button>
                        </div>
                      </td>
                      <td className="text-right">
                        <span
                          className={
                            (tot?.absent ?? 0) > 0
                              ? 'school-pill-coral'
                              : 'school-pill-muted'
                          }
                        >
                          {tot?.absent ?? 0}
                        </span>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {(roster?.teachers.length ?? 0) > 0 && (
        <div className="school-fab">
          <span className="truncate">
            {absentCount} absent{absentCount > 1 ? 's' : ''} · {presentCount} présents
          </span>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => {
              save.reset()
              save.mutate()
            }}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-school-grape shadow transition hover:bg-school-cream disabled:opacity-60"
          >
            {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────────── helpers ───────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
        {label}
      </span>
      {children}
    </label>
  )
}

/**
 * Date quick-jumps used next to the date input. Lets the user jump to
 * yesterday / today / tomorrow without opening the date picker.
 */
function DateShortcut({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10)
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10)

  const opts = [
    { d: yesterday, label: 'Hier' },
    { d: today, label: "Aujourd'hui" },
    { d: tomorrow, label: 'Demain' },
  ]

  return (
    <>
      {opts.map((o) => {
        const active = value === o.d
        return (
          <button
            key={o.label}
            type="button"
            onClick={() => onChange(o.d)}
            className={[
              'rounded-full px-3 py-1 text-xs font-bold transition',
              active
                ? 'bg-school-grape text-white shadow'
                : 'border border-school-line bg-white text-school-inkmuted hover:text-school-grape',
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </>
  )
}
