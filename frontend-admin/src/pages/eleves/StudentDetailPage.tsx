import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import * as attendanceApi from '../../api/attendance'
import * as classesApi from '../../api/classes'
import * as enrollmentsApi from '../../api/enrollments'
import * as schoolYearsApi from '../../api/schoolYears'
import * as studentsApi from '../../api/students'
import { useAuth } from '../../contexts/AuthContext'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { StudentAvatar } from '../../components/ui/StudentAvatar'
import { getApiErrorMessage } from '../../utils/apiError'

type Tab =
  | 'infos'
  | 'inscription'
  | 'historique'
  | 'documents'
  | 'notes'
  | 'absences'
  | 'finance'

type TabDef = { id: Tab; label: string; emoji: string; simple: boolean }

const allTabs: TabDef[] = [
  { id: 'infos', label: 'Infos générales', emoji: '🪪', simple: true },
  { id: 'inscription', label: 'Inscription', emoji: '📝', simple: true },
  { id: 'historique', label: 'Historique', emoji: '🕰️', simple: false },
  { id: 'documents', label: 'Documents', emoji: '📁', simple: true },
  { id: 'notes', label: 'Notes', emoji: '📊', simple: false },
  { id: 'absences', label: 'Absences', emoji: '🗓️', simple: true },
  { id: 'finance', label: 'Finance', emoji: '💰', simple: false },
]

const STATUS_PILL: Record<string, string> = {
  pending: 'school-pill-sun',
  active: 'school-pill-green',
  transferred: 'school-pill-sky',
  graduated: 'school-pill-grape',
  suspended: 'school-pill-coral',
  withdrawn: 'school-pill-muted',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  active: 'Actif',
  transferred: 'Transféré',
  graduated: 'Diplômé',
  suspended: 'Suspendu',
  withdrawn: 'Retiré',
}

function ageOf(dob?: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age >= 0 ? age : null
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function StudentDetailPage() {
  const { id } = useParams()
  const numericId = id ? parseInt(id, 10) : NaN
  const { simpleMode } = useSimpleMode()
  const tabs = simpleMode ? allTabs.filter((t) => t.simple) : allTabs
  const [tab, setTab] = useState<Tab>('infos')
  const { hasPermission } = useAuth()
  const canManage = hasPermission('students.manage')
  const canEnroll = hasPermission('enrollments.manage')
  const canJustifyAttendance = hasPermission('attendance.justify')
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const flash = (location.state as { flash?: string } | null)?.flash ?? null
  const [flashMsg, setFlashMsg] = useState<string | null>(flash)
  useEffect(() => {
    if (!flash) return
    setFlashMsg(flash)
    navigate(location.pathname, { replace: true, state: null })
    const t = window.setTimeout(() => setFlashMsg(null), 5000)
    return () => window.clearTimeout(t)
  }, [flash, location.pathname, navigate])

  const [syEnrollment, setSyEnrollment] = useState<number>(0)
  const [classId, setClassId] = useState<number>(0)
  const [enrollmentNumber, setEnrollmentNumber] = useState('')
  const [enrollmentDate, setEnrollmentDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [enrollErr, setEnrollErr] = useState<string | null>(null)

  const { data: student, isLoading, isError, error } = useQuery({
    queryKey: ['student', numericId],
    queryFn: () => studentsApi.fetchStudent(numericId),
    enabled: !Number.isNaN(numericId),
  })

  const { data: history } = useQuery({
    queryKey: ['student-history', numericId],
    queryFn: () => studentsApi.fetchStudentHistory(numericId),
    enabled: !Number.isNaN(numericId) && tab === 'historique',
  })

  const { data: grades } = useQuery({
    queryKey: ['student-grades', numericId],
    queryFn: () => studentsApi.fetchStudentGrades(numericId, { per_page: 50 }),
    enabled: !Number.isNaN(numericId) && tab === 'notes',
  })

  const { data: attendance } = useQuery({
    queryKey: ['attendance-records-student', numericId],
    queryFn: () =>
      attendanceApi.fetchAttendanceRecords({
        student_id: numericId,
        per_page: 100,
      }),
    enabled: !Number.isNaN(numericId) && tab === 'absences',
  })

  const justifyMutation = useMutation({
    mutationFn: (p: { id: number; note?: string }) =>
      attendanceApi.justifyAttendance(p.id, {
        is_justified: true,
        justification_note: p.note ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records-student', numericId] })
    },
  })

  const { data: documents } = useQuery({
    queryKey: ['student-documents', numericId],
    queryFn: () => studentsApi.fetchStudentDocuments(numericId),
    enabled: !Number.isNaN(numericId) && tab === 'documents',
  })

  const { data: finance } = useQuery({
    queryKey: ['student-finance', numericId],
    queryFn: () => studentsApi.fetchStudentFinance(numericId),
    enabled: !Number.isNaN(numericId) && tab === 'finance',
  })

  const { data: years } = useQuery({
    queryKey: ['school-years-all'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 100,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
    enabled: tab === 'inscription' && canEnroll,
  })

  const { data: classesForYear } = useQuery({
    queryKey: ['classes-enroll', syEnrollment],
    queryFn: () =>
      classesApi.fetchClasses({
        per_page: 100,
        school_year_id: syEnrollment,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    enabled: tab === 'inscription' && syEnrollment > 0,
  })

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments-student', numericId],
    queryFn: () => enrollmentsApi.fetchEnrollments({ student_id: numericId, per_page: 50 }),
    enabled: !Number.isNaN(numericId) && tab === 'inscription',
  })

  const createEnrollment = useMutation({
    mutationFn: () =>
      enrollmentsApi.createEnrollment({
        student_id: numericId,
        school_year_id: syEnrollment,
        class_id: classId,
        enrollment_number: enrollmentNumber,
        enrollment_date: enrollmentDate,
        registration_status: 'validated',
        academic_status: 'enrolled',
        admission_type: 'new',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments-student'] })
      queryClient.invalidateQueries({ queryKey: ['student', numericId] })
      setEnrollErr(null)
      setEnrollmentNumber('')
    },
    onError: (e) =>
      setEnrollErr(getApiErrorMessage(e, "Impossible d'enregistrer l'inscription.")),
  })

  if (Number.isNaN(numericId)) {
    return (
      <p className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
        Identifiant invalide.
      </p>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-3xl border-2 border-school-line bg-white/70" />
        <div className="h-12 animate-pulse rounded-2xl border-2 border-school-line bg-white/70" />
        <div className="h-64 animate-pulse rounded-3xl border-2 border-school-line bg-white/70" />
      </div>
    )
  }
  if (isError) {
    return (
      <p className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
        {(error as Error).message}
      </p>
    )
  }
  if (!student) return null

  const age = ageOf(student.date_of_birth)
  const statusPill = STATUS_PILL[student.status] ?? 'school-pill-muted'
  const statusLabel = STATUS_LABEL[student.status] ?? student.status

  return (
    <div className="space-y-5">
      <Link
        to="/eleves"
        className="inline-flex items-center gap-1 text-sm font-bold text-school-grape hover:underline"
      >
        ← Retour aux élèves
      </Link>
      {flashMsg ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          ✅ {flashMsg}
        </div>
      ) : null}

      <section className="school-hero">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-white/15 p-1 backdrop-blur ring-2 ring-white/30">
              <StudentAvatar
                firstName={student.first_name}
                lastName={student.last_name}
                seed={student.id}
                size="lg"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">
                Fiche élève
              </p>
              <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                {student.first_name} {student.last_name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="school-chip-on-dark">
                  <span aria-hidden>🪪</span>
                  {student.student_code}
                </span>
                {age != null ? (
                  <span className="school-chip-on-dark">
                    <span aria-hidden>🎂</span>
                    {age} ans
                  </span>
                ) : null}
                <span className={`${statusPill} !bg-white/90`}>{statusLabel}</span>
              </div>
            </div>
          </div>
          {canManage && (
            <Link
              to={`/eleves/${student.id}/editer`}
              className="rounded-2xl border-2 border-white/60 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              ✏️ Modifier
            </Link>
          )}
        </div>
      </section>

      <div
        className="flex flex-wrap gap-1.5 rounded-3xl border-2 border-school-line bg-white p-1.5 shadow-school"
        role="tablist"
      >
        {tabs.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={[
                'school-tab-pill flex items-center gap-1.5',
                active ? 'school-tab-pill-active' : 'school-tab-pill-idle hover:bg-school-cream',
              ].join(' ')}
            >
              <span aria-hidden>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {tab === 'infos' && (
        <section className="school-section space-y-4">
          <SectionTitle
            emoji="🪪"
            title="Infos générales"
            iconClassName="bg-school-mist text-school-skydeep"
          />
          <dl className="school-dl">
            <div>
              <dt>Statut</dt>
              <dd>
                <span className={statusPill}>{statusLabel}</span>
              </dd>
            </div>
            <div>
              <dt>Date de naissance</dt>
              <dd>{formatDate(student.date_of_birth)}</dd>
            </div>
            {!simpleMode && (
              <>
                <div>
                  <dt>Lieu de naissance</dt>
                  <dd>{student.place_of_birth ?? '—'}</dd>
                </div>
                <div>
                  <dt>Nationalité</dt>
                  <dd>{student.nationality ?? '—'}</dd>
                </div>
              </>
            )}
            <div>
              <dt>Ville</dt>
              <dd>{student.city ?? '—'}</dd>
            </div>
            {!simpleMode && (
              <div>
                <dt>Adresse</dt>
                <dd>{student.address ?? '—'}</dd>
              </div>
            )}
            <div>
              <dt>Contact urgence</dt>
              <dd>
                {student.emergency_contact_name ?? '—'}
                {student.emergency_contact_phone
                  ? ` · ${student.emergency_contact_phone}`
                  : ''}
              </dd>
            </div>
            <div>
              <dt>Téléphone parents</dt>
              <dd>
                {[
                  student.parent_phone_1,
                  student.parent_phone_2,
                  student.parent_phone_3,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {tab === 'inscription' && (
        <div className="space-y-4">
          <section className="school-section">
            <SectionTitle
              emoji="📝"
              title="Inscriptions enregistrées"
              iconClassName="bg-school-grape/10 text-school-grape"
            />
            {enrollments?.items?.length ? (
              <ul className="space-y-2">
                {enrollments.items.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-school-line bg-white px-4 py-3 text-sm"
                  >
                    <span className="font-mono text-xs text-school-inkmuted">
                      {e.enrollment_number}
                    </span>
                    <span className="school-chip">
                      {e.school_year_name ?? e.school_year?.name ?? 'Non défini'}
                    </span>
                    <span className="school-pill-sky">
                      {e.class_name ?? e.school_class?.name ?? 'Non défini'}
                    </span>
                    {!simpleMode && (
                      <span className="ml-auto text-xs font-semibold text-school-inkmuted">
                        {e.academic_status} · {e.registration_status}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                emoji="🪶"
                title="Aucune inscription"
                hint="Les inscriptions enregistrées s'afficheront ici."
              />
            )}
          </section>

          {canEnroll && (
            <form
              className="school-section space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                setEnrollErr(null)
                if (!syEnrollment || !classId || !enrollmentNumber.trim()) {
                  setEnrollErr("Renseignez année, classe et numéro d'inscription.")
                  return
                }
                createEnrollment.mutate()
              }}
            >
              <SectionTitle
                emoji="➕"
                title="Nouvelle inscription"
                iconClassName="bg-school-leaf/15 text-school-leafdeep"
              />
              {enrollErr && (
                <p className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-2.5 text-sm font-semibold text-[#B23A2E]">
                  {enrollErr}
                </p>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Année scolaire">
                  <select
                    required
                    value={syEnrollment || ''}
                    onChange={(e) => {
                      setSyEnrollment(Number(e.target.value))
                      setClassId(0)
                    }}
                    className="school-select"
                  >
                    <option value="">—</option>
                    {years?.items.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Classe">
                  <select
                    required
                    value={classId || ''}
                    onChange={(e) => setClassId(Number(e.target.value))}
                    className="school-select"
                  >
                    <option value="">—</option>
                    {classesForYear?.items.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="N° inscription">
                  <input
                    value={enrollmentNumber}
                    onChange={(e) => setEnrollmentNumber(e.target.value)}
                    className="school-input"
                  />
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    value={enrollmentDate}
                    onChange={(e) => setEnrollmentDate(e.target.value)}
                    className="school-input"
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createEnrollment.isPending}
                  className="school-btn-primary disabled:opacity-60"
                >
                  {createEnrollment.isPending
                    ? 'Enregistrement…'
                    : "Enregistrer l'inscription"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === 'historique' && (
        <section className="school-section">
          <SectionTitle
            emoji="🕰️"
            title="Chronologie"
            iconClassName="bg-school-lilac/20 text-[#5b3fa0]"
          />
          {history && (history.timeline as { date?: string; label?: string }[]).length ? (
            <ul className="space-y-2">
              {(history.timeline as { date?: string; label?: string }[]).map((ev, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-2xl border-2 border-school-line bg-white px-4 py-3"
                >
                  <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-school-grape" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                      {ev.date}
                    </p>
                    <p className="text-sm font-semibold text-school-ink">{ev.label}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              emoji="🌱"
              title="Pas encore d'historique"
              hint="Les évènements liés à cet élève apparaîtront ici."
            />
          )}
        </section>
      )}

      {tab === 'documents' && (
        <section className="school-section">
          <SectionTitle
            emoji="📁"
            title="Documents"
            iconClassName="bg-school-sunsoft text-[#8A6A00]"
          />
          {documents && (documents as Array<unknown>).length ? (
            <div className="school-table-wrap">
              <table className="school-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Type</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {(documents as { id: number; title: string; document_type: string; status: string }[]).map(
                    (d) => (
                      <tr key={d.id}>
                        <td className="font-semibold">{d.title}</td>
                        <td className="text-school-inkmuted">{d.document_type}</td>
                        <td>
                          <span className="school-pill-sky">{d.status}</span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              emoji="📂"
              title="Aucun document"
              hint="Les documents importés apparaîtront ici."
            />
          )}
        </section>
      )}

      {tab === 'notes' && (
        <section className="school-section">
          <SectionTitle
            emoji="📊"
            title="Notes"
            iconClassName="bg-school-grape/10 text-school-grape"
          />
          {grades && (grades.items as Array<unknown>).length ? (
            <ul className="divide-y divide-school-line">
              {(grades.items as { score?: string; subject?: { name?: string } }[]).map(
                (g, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="font-semibold text-school-ink">
                      {g.subject?.name ?? '—'}
                    </span>
                    <span className="font-display text-base font-bold text-school-grape tabular-nums">
                      {g.score ?? '—'}
                    </span>
                  </li>
                )
              )}
            </ul>
          ) : (
            <EmptyState
              emoji="📐"
              title="Pas encore de notes"
              hint="Les notes apparaîtront ici une fois saisies."
            />
          )}
        </section>
      )}

      {tab === 'absences' && (
        <section className="school-section">
          <SectionTitle
            emoji="🗓️"
            title="Absences & retards"
            iconClassName="bg-school-coral/15 text-[#B23A2E]"
          />
          {attendance && (attendance.items as attendanceApi.AttendanceRecord[]).length ? (
            <div className="school-table-wrap">
              <table className="school-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Justifié</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(attendance.items as attendanceApi.AttendanceRecord[]).map((a) => (
                    <tr key={a.id}>
                      <td className="text-school-inkmuted">{formatDate(a.attendance_date)}</td>
                      <td>
                        {a.attendance_status === 'absent' ? (
                          <span className="school-pill-coral">Absent</span>
                        ) : a.attendance_status === 'late' ? (
                          <span className="school-pill-sun">
                            Retard
                            {a.minutes_late != null ? ` · ${a.minutes_late} min` : ''}
                          </span>
                        ) : (
                          <span className="school-pill-green">Présent</span>
                        )}
                      </td>
                      <td>
                        {a.is_justified ? (
                          <span className="school-pill-green">Oui</span>
                        ) : (
                          <span className="school-pill-muted">Non</span>
                        )}
                      </td>
                      <td className="text-right">
                        {canJustifyAttendance &&
                          a.attendance_status === 'absent' &&
                          !a.is_justified && (
                            <button
                              type="button"
                              onClick={() => justifyMutation.mutate({ id: a.id })}
                              disabled={justifyMutation.isPending}
                              className="text-xs font-bold text-school-grape hover:underline disabled:opacity-60"
                            >
                              Justifier
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              emoji="🌤️"
              title="Aucune absence enregistrée"
              hint="Bonne nouvelle ! Aucun retard ni absence à signaler."
            />
          )}
        </section>
      )}

      {tab === 'finance' && finance && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="school-section">
            <SectionTitle
              emoji="💼"
              title="Frais"
              iconClassName="bg-school-sunsoft text-[#8A6A00]"
            />
            {(finance.fee_assignments ?? []).length ? (
              <ul className="space-y-2 text-sm">
                {(
                  finance.fee_assignments as { id: number; status: string; balance: string }[]
                ).map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded-2xl border-2 border-school-line bg-white px-4 py-2.5"
                  >
                    <span className="text-xs text-school-inkmuted">Frais</span>
                    <span className="school-pill-sky">{f.status}</span>
                    <span className="font-bold tabular-nums text-school-ink">{f.balance}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-school-inkmuted">Aucun frais.</p>
            )}
          </section>
          <section className="school-section">
            <SectionTitle
              emoji="💰"
              title="Paiements"
              iconClassName="bg-school-leaf/15 text-school-leafdeep"
            />
            {(finance.payments ?? []).length ? (
              <ul className="space-y-2 text-sm">
                {(
                  finance.payments as { id: number; amount: string; payment_date?: string }[]
                ).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-2xl border-2 border-school-line bg-white px-4 py-2.5"
                  >
                    <span className="text-xs text-school-inkmuted">Paiement</span>
                    <span className="text-school-inkmuted">
                      {formatDate(p.payment_date)}
                    </span>
                    <span className="font-bold tabular-nums text-school-leafdeep">
                      +{p.amount}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-school-inkmuted">Aucun paiement.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

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
