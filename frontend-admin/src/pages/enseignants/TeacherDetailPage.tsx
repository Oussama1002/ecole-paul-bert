import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as classesApi from '../../api/classes'
import * as schoolYearsApi from '../../api/schoolYears'
import * as subjectsApi from '../../api/subjects'
import * as teachersApi from '../../api/teachers'
import { useAuth } from '../../contexts/AuthContext'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { StudentAvatar } from '../../components/ui/StudentAvatar'
import { getApiErrorMessage } from '../../utils/apiError'
import * as scheduleApi from '../../api/schedule'
import type { ScheduleEntry } from '../../api/teachers'
import { TeacherFormModal } from './TeacherFormModal'
import { TeacherPlanningModal } from './TeacherPlanningModal'

type Tab = 'profil' | 'matieres' | 'classes' | 'planning' | 'documents' | 'observations'

type TabDef = { id: Tab; label: string; emoji: string; simple: boolean }

const allTabs: TabDef[] = [
  { id: 'profil', label: 'Profil', emoji: '🪪', simple: true },
  { id: 'matieres', label: 'Matières', emoji: '📚', simple: false },
  { id: 'classes', label: 'Classes', emoji: '🚪', simple: false },
  { id: 'planning', label: 'Planning', emoji: '📅', simple: false },
  { id: 'documents', label: 'Documents', emoji: '📁', simple: true },
  { id: 'observations', label: 'Observations', emoji: '📝', simple: true },
]

const observationTypeLabels: Record<string, string> = {
  observation: 'Observation',
  complaint: 'Réclamation',
  note: 'Note',
}

const observationTypePill: Record<string, string> = {
  observation: 'school-pill-sky',
  complaint: 'school-pill-coral',
  note: 'school-pill-green',
}

import { TEACHER_DOC_TYPE_LABELS } from '../../utils/teacherDocumentTypes'

const dayFr: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
}

const employmentLabels: Record<string, string> = {
  full_time: 'Temps plein',
  part_time: 'Temps partiel',
  contract: 'Contrat',
  temporary: 'Intérim',
}

const statusLabels: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  suspended: 'Suspendu',
  left: 'Parti',
}

const statusPill: Record<string, string> = {
  active: 'school-pill-green',
  inactive: 'school-pill-muted',
  suspended: 'school-pill-coral',
  left: 'school-pill-muted',
}

export function TeacherDetailPage() {
  const { id } = useParams()
  const numericId = id ? parseInt(id, 10) : NaN
  const { simpleMode } = useSimpleMode()
  const tabs = simpleMode ? allTabs.filter((t) => t.simple) : allTabs
  const [tab, setTab] = useState<Tab>('profil')
  const [editOpen, setEditOpen] = useState(false)
  const [planningModal, setPlanningModal] = useState<
    { mode: 'new' } | { mode: 'edit'; entry: ScheduleEntry } | null
  >(null)
  const { hasPermission } = useAuth()
  const canManage = hasPermission('teachers.manage')
  const queryClient = useQueryClient()

  const [sySchedule, setSySchedule] = useState<number>(0)
  const [classId, setClassId] = useState(0)
  const [subjectId, setSubjectId] = useState(0)
  const [syAssign, setSyAssign] = useState(0)
  const [weeklyHours, setWeeklyHours] = useState('')
  const [assignErr, setAssignErr] = useState<string | null>(null)
  const [docType, setDocType] = useState('contract')
  const [docErr, setDocErr] = useState<string | null>(null)

  const { data: teacher, isLoading, isError, error } = useQuery({
    queryKey: ['teacher', numericId],
    queryFn: () => teachersApi.fetchTeacher(numericId),
    enabled: !Number.isNaN(numericId),
  })

  const { data: assignments } = useQuery({
    queryKey: ['teacher-assignments', numericId],
    queryFn: () => teachersApi.fetchTeacherAssignments(numericId),
    enabled:
      !Number.isNaN(numericId) && (tab === 'matieres' || tab === 'classes'),
  })

  const { data: schedule } = useQuery({
    queryKey: ['teacher-schedule', numericId, sySchedule],
    queryFn: () =>
      teachersApi.fetchTeacherSchedule(
        numericId,
        sySchedule > 0 ? sySchedule : undefined
      ),
    enabled: !Number.isNaN(numericId) && tab === 'planning',
  })

  const { data: documents } = useQuery({
    queryKey: ['teacher-documents', numericId],
    queryFn: () => teachersApi.fetchTeacherDocuments(numericId),
    enabled: !Number.isNaN(numericId) && tab === 'documents',
  })

  const { data: years } = useQuery({
    queryKey: ['school-years-all'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 100,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
    enabled: tab === 'planning' || (tab === 'matieres' && canManage),
  })

  const { data: classesForYear } = useQuery({
    queryKey: ['classes-assign', syAssign],
    queryFn: () =>
      classesApi.fetchClasses({
        per_page: 100,
        school_year_id: syAssign,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    enabled: tab === 'matieres' && canManage && syAssign > 0,
  })

  const { data: subjectsList } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: () =>
      subjectsApi.fetchSubjects({
        per_page: 500,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    enabled: tab === 'matieres' && canManage,
  })

  const distinctSubjects = useMemo(() => {
    if (!assignments?.length) return []
    const m = new Map<number, { id: number; name: string; code: string }>()
    for (const a of assignments) {
      if (a.subject && !m.has(a.subject.id)) m.set(a.subject.id, a.subject)
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [assignments])

  const distinctClasses = useMemo(() => {
    if (!assignments?.length) return []
    const m = new Map<number, { id: number; name: string; code: string }>()
    for (const a of assignments) {
      if (a.school_class && !m.has(a.school_class.id))
        m.set(a.school_class.id, a.school_class)
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [assignments])

  const createAssign = useMutation({
    mutationFn: () =>
      teachersApi.createTeacherAssignment(numericId, {
        class_id: classId,
        subject_id: subjectId,
        school_year_id: syAssign,
        weekly_hours: weeklyHours ? parseFloat(weeklyHours) : null,
        status: 'active',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] })
      setAssignErr(null)
      setWeeklyHours('')
    },
    onError: (e: Error) => setAssignErr(e.message),
  })

  const removeAssign = useMutation({
    mutationFn: (aid: number) => teachersApi.deleteTeacherAssignment(aid),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] }),
  })

  const uploadDoc = useMutation({
    mutationFn: (file: File) =>
      teachersApi.uploadTeacherDocument(numericId, file, docType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-documents'] })
      setDocErr(null)
    },
    onError: (e: Error) => setDocErr(e.message),
  })

  const removeDoc = useMutation({
    mutationFn: (did: number) => teachersApi.deleteTeacherDocument(did),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['teacher-documents'] }),
  })

  const removeSchedule = useMutation({
    mutationFn: (sid: number) => scheduleApi.deleteScheduleEntry(sid),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['teacher-schedule'] }),
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
  if (!teacher) return null

  return (
    <div className="space-y-5">
      <Link
        to="/enseignants"
        className="inline-flex items-center gap-1 text-sm font-bold text-school-grape hover:underline"
      >
        ← Retour aux enseignants
      </Link>

      <section className="school-hero">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-white/15 p-1 backdrop-blur ring-2 ring-white/30">
              <StudentAvatar
                firstName={teacher.first_name}
                lastName={teacher.last_name}
                seed={`t-${teacher.id}`}
                size="lg"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">
                Fiche enseignant
              </p>
              <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                {teacher.first_name} {teacher.last_name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {!simpleMode ? (
                  <span className="school-chip-on-dark">
                    <span aria-hidden>🪪</span>
                    {teacher.employee_code}
                  </span>
                ) : null}
                {!simpleMode && (
                  <span className={`${statusPill[teacher.status] ?? 'school-pill-muted'} !bg-white/90`}>
                    {statusLabels[teacher.status] ?? teacher.status}
                  </span>
                )}
                {teacher.email ? (
                  <span className="school-chip-on-dark">
                    <span aria-hidden>📧</span>
                    {teacher.email}
                  </span>
                ) : null}
                {teacher.phone ? (
                  <span className="school-chip-on-dark">
                    <span aria-hidden>📞</span>
                    {teacher.phone}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-2xl border-2 border-white/60 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              ✏️ Modifier
            </button>
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
                active
                  ? 'school-tab-pill-active'
                  : 'school-tab-pill-idle hover:bg-school-cream',
              ].join(' ')}
            >
              <span aria-hidden>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {tab === 'profil' && (
        <section className="school-section space-y-4">
          <SectionTitle
            emoji="🪪"
            title="Profil"
            iconClassName="bg-school-mist text-school-skydeep"
          />
          <dl className="school-dl">
            <div>
              <dt>Email</dt>
              <dd>{teacher.email ?? '—'}</dd>
            </div>
            <div>
              <dt>Téléphone</dt>
              <dd>{teacher.phone ?? '—'}</dd>
            </div>
            {!simpleMode && (
              <>
                <div>
                  <dt>Statut</dt>
                  <dd>
                    <span className={statusPill[teacher.status] ?? 'school-pill-muted'}>
                      {statusLabels[teacher.status] ?? teacher.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Type de contrat</dt>
                  <dd>
                    {employmentLabels[teacher.employment_type] ??
                      teacher.employment_type}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt>Compte utilisateur</dt>
                  <dd>{teacher.user?.email ?? '—'}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt>Qualification</dt>
                  <dd>{teacher.qualification ?? '—'}</dd>
                </div>
              </>
            )}
          </dl>
        </section>
      )}

      {tab === 'matieres' && (
        <div className="space-y-4">
          <section className="school-section">
            <SectionTitle
              emoji="📚"
              title="Matières (déduites des affectations)"
              iconClassName="bg-school-grape/10 text-school-grape"
            />
            {distinctSubjects.length === 0 ? (
              <EmptyState
                emoji="📐"
                title="Aucune matière"
                hint="Aucune affectation enregistrée pour cet enseignant."
              />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {distinctSubjects.map((s) => (
                  <li key={s.id} className="school-chip">
                    <span>{s.name}</span>
                    <span className="font-mono text-[11px] text-school-inkmuted">
                      {s.code}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canManage && (
            <section className="school-section space-y-3">
              <SectionTitle
                emoji="➕"
                title="Nouvelle affectation"
                hint="Classe + matière + année"
                iconClassName="bg-school-leaf/15 text-school-leafdeep"
              />
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Année scolaire">
                  <select
                    value={syAssign || ''}
                    onChange={(e) => {
                      setSyAssign(parseInt(e.target.value, 10) || 0)
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
                    value={classId || ''}
                    onChange={(e) =>
                      setClassId(parseInt(e.target.value, 10) || 0)
                    }
                    disabled={syAssign <= 0}
                    className="school-select disabled:opacity-60"
                  >
                    <option value="">—</option>
                    {classesForYear?.items.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Matière">
                  <select
                    value={subjectId || ''}
                    onChange={(e) =>
                      setSubjectId(parseInt(e.target.value, 10) || 0)
                    }
                    className="school-select"
                  >
                    <option value="">—</option>
                    {subjectsList?.items.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Heures / sem.">
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(e.target.value)}
                    className="school-input"
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={
                    createAssign.isPending ||
                    !classId ||
                    !subjectId ||
                    !syAssign
                  }
                  onClick={() => createAssign.mutate()}
                  className="school-btn-primary disabled:opacity-50"
                >
                  Ajouter
                </button>
              </div>
              {assignErr && (
                <p className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-2.5 text-sm font-semibold text-[#B23A2E]">
                  {assignErr}
                </p>
              )}
            </section>
          )}

          {assignments && assignments.length > 0 && (
            <div className="school-table-wrap">
              <table className="school-table">
                <thead>
                  <tr>
                    <th>Année</th>
                    <th>Classe</th>
                    <th>Matière</th>
                    <th>H./sem.</th>
                    {canManage && <th />}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td className="text-school-inkmuted">
                        {a.school_year?.name ?? a.school_year_id}
                      </td>
                      <td className="font-semibold">
                        {a.school_class?.name ?? '—'}
                      </td>
                      <td>{a.subject?.name ?? '—'}</td>
                      <td className="tabular-nums">{a.weekly_hours ?? '—'}</td>
                      {canManage && (
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Retirer cette affectation ?')) {
                                removeAssign.mutate(a.id)
                              }
                            }}
                            className="text-xs font-bold text-[#B23A2E] hover:underline"
                          >
                            Supprimer
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'classes' && (
        <section className="school-section">
          <SectionTitle
            emoji="🚪"
            title="Classes"
            iconClassName="bg-school-mist text-school-skydeep"
          />
          {distinctClasses.length === 0 ? (
            <EmptyState
              emoji="🚪"
              title="Aucune classe"
              hint="Cet enseignant n'a pas encore d'affectation."
            />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {distinctClasses.map((c) => (
                <li key={c.id} className="school-pill-sky">
                  {c.name}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'planning' && (
        <section className="school-section space-y-3">
          <SectionTitle
            emoji="📅"
            title="Planning"
            iconClassName="bg-school-sunsoft text-[#8A6A00]"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={sySchedule || ''}
                  onChange={(e) =>
                    setSySchedule(parseInt(e.target.value, 10) || 0)
                  }
                  className="school-select"
                >
                  <option value="">Toutes années</option>
                  {years?.items.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setPlanningModal({ mode: 'new' })}
                    className="school-btn-primary whitespace-nowrap"
                  >
                    + Ajouter un créneau
                  </button>
                )}
              </div>
            }
          />
          {!schedule?.length ? (
            <EmptyState
              emoji="📭"
              title="Aucun créneau"
              hint="Aucune ligne dans la table emploi du temps pour cet enseignant."
            />
          ) : (
            <div className="school-table-wrap">
              <table className="school-table">
                <thead>
                  <tr>
                    <th>Jour</th>
                    <th>Horaire</th>
                    <th>Classe</th>
                    <th>Matière</th>
                    <th>Salle</th>
                    {canManage && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((e) => (
                    <tr key={e.id}>
                      <td className="font-semibold">
                        {dayFr[e.day_of_week] ?? e.day_of_week}
                      </td>
                      <td className="font-mono tabular-nums">
                        {e.start_time} – {e.end_time}
                      </td>
                      <td>{e.school_class?.name ?? '—'}</td>
                      <td>{e.subject?.name ?? '—'}</td>
                      <td className="text-school-inkmuted">
                        {e.room?.name ?? '—'}
                      </td>
                      {canManage && (
                        <td className="text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setPlanningModal({ mode: 'edit', entry: e })}
                              className="text-xs font-bold text-school-skydeep hover:underline"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Supprimer ce créneau ?')) {
                                  removeSchedule.mutate(e.id)
                                }
                              }}
                              className="text-xs font-bold text-[#B23A2E] hover:underline"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'documents' && (
        <section className="school-section space-y-3">
          <SectionTitle
            emoji="📁"
            title="Documents"
            iconClassName="bg-school-sunsoft text-[#8A6A00]"
          />
          {canManage && (
            <div className="rounded-2xl border-2 border-school-line bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-school-ink">
                Envoyer un document
              </p>
              <div className="flex flex-wrap items-end gap-3">
                {!simpleMode && (
                  <Field label="Type">
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="school-select"
                    >
                      {Object.entries(TEACHER_DOC_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadDoc.mutate(f)
                    e.target.value = ''
                  }}
                  className="text-sm"
                />
              </div>
              {docErr && (
                <p className="mt-2 rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-2.5 text-sm font-semibold text-[#B23A2E]">
                  {docErr}
                </p>
              )}
            </div>
          )}
          {!documents?.length ? (
            <EmptyState
              emoji="📂"
              title="Aucun document"
              hint="Les documents importés apparaîtront ici."
            />
          ) : (
            <ul className="space-y-2">
              {documents.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-school-line bg-white px-4 py-3"
                >
                  <div>
                    <span className="font-semibold text-school-ink">
                      {d.title}
                    </span>
                    {!simpleMode && (
                      <span className="ml-2 text-xs text-school-inkmuted">
                        {TEACHER_DOC_TYPE_LABELS[d.document_type] ?? d.document_type}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    {d.file_url && (
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-school-grape hover:underline"
                      >
                        ⬇ Télécharger
                      </a>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Supprimer ce document ?')) {
                            removeDoc.mutate(d.id)
                          }
                        }}
                        className="text-xs font-bold text-[#B23A2E] hover:underline"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'observations' && (
        <ObservationsPanel teacherId={numericId} canManage={canManage} />
      )}

      {editOpen && (
        <TeacherFormModal teacherId={numericId} onClose={() => setEditOpen(false)} />
      )}

      {planningModal && (
        <TeacherPlanningModal
          teacherId={numericId}
          entry={planningModal.mode === 'edit' ? planningModal.entry : null}
          defaultSchoolYearId={sySchedule}
          years={years?.items ?? []}
          onClose={() => setPlanningModal(null)}
        />
      )}
    </div>
  )
}

function ObservationsPanel({
  teacherId,
  canManage,
}: {
  teacherId: number
  canManage: boolean
}) {
  const queryClient = useQueryClient()
  const [type, setType] =
    useState<teachersApi.TeacherObservationType>('observation')
  const [comment, setComment] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const { data: items, isLoading } = useQuery({
    queryKey: ['teacher-observations', teacherId],
    queryFn: () => teachersApi.fetchTeacherObservations(teacherId),
    enabled: !Number.isNaN(teacherId),
  })

  const create = useMutation({
    mutationFn: () =>
      teachersApi.createTeacherObservation(teacherId, {
        type,
        comment: comment.trim(),
      }),
    onSuccess: () => {
      setComment('')
      setErr(null)
      queryClient.invalidateQueries({ queryKey: ['teacher-observations', teacherId] })
    },
    onError: (e) =>
      setErr(getApiErrorMessage(e, "Impossible d'ajouter l'observation.")),
  })

  const remove = useMutation({
    mutationFn: (id: number) =>
      teachersApi.deleteTeacherObservation(teacherId, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['teacher-observations', teacherId] }),
  })

  return (
    <section className="school-section space-y-3">
      <SectionTitle
        emoji="📝"
        title="Observations"
        iconClassName="bg-school-grape/10 text-school-grape"
      />
      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!comment.trim()) {
              setErr('Écris un commentaire.')
              return
            }
            create.mutate()
          }}
          className="space-y-3 rounded-2xl border-2 border-school-line bg-white p-4"
        >
          <Field label="Type">
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as teachersApi.TeacherObservationType)
              }
              className="school-select"
            >
              {Object.entries(observationTypeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Commentaire">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Rédige l'observation…"
              className="school-input"
              maxLength={4000}
            />
          </Field>
          {err && (
            <p className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-2.5 text-sm font-semibold text-[#B23A2E]">
              {err}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={create.isPending}
              className="school-btn-primary disabled:opacity-60"
            >
              {create.isPending ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-sm text-school-inkmuted">Chargement…</p>}
      {!isLoading && (items?.length ?? 0) === 0 && (
        <EmptyState
          emoji="🌱"
          title="Aucune observation"
          hint="Les observations apparaîtront ici."
        />
      )}

      <ul className="space-y-3">
        {(items ?? []).map((o) => (
          <li
            key={o.id}
            className="rounded-2xl border-2 border-school-line bg-white p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={observationTypePill[o.type] ?? 'school-pill-muted'}
                >
                  {observationTypeLabels[o.type] ?? o.type}
                </span>
                <span className="text-xs text-school-inkmuted">
                  {new Date(o.created_at).toLocaleString('fr-FR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                  {o.author?.name ? ` · ${o.author.name}` : ''}
                </span>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Supprimer cette observation ?'))
                      remove.mutate(o.id)
                  }}
                  className="text-xs font-bold text-[#B23A2E] hover:underline"
                >
                  Supprimer
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-school-ink">
              {o.comment}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
        {label}
      </span>
      {children}
    </label>
  )
}
