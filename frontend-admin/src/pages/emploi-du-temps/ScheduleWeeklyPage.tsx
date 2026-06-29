import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useEffect, useMemo, useState } from 'react'
import * as classesApi from '../../api/classes'
import * as roomsApi from '../../api/rooms'
import * as scheduleApi from '../../api/schedule'
import * as schoolYearsApi from '../../api/schoolYears'
import * as subjectsApi from '../../api/subjects'
import * as teachersApi from '../../api/teachers'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrentSchoolYear } from '../../hooks/useCurrentSchoolYear'
import { getApiErrorMessage } from '../../utils/apiError'
import { isTeacherRole } from '../../utils/roles'

const DOW = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

const DOW_FR: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
}

const SESSION_LABELS: Record<string, string> = {
  course: 'Cours',
  exam: 'Examen',
  support: 'Soutien',
  activity: 'Activité',
  meeting: 'Réunion',
}

const SESSION_CARD: Record<string, string> = {
  course: 'border-school-sky/50 bg-gradient-to-br from-white to-school-sky/10 hover:border-school-sky hover:shadow-school',
  exam: 'border-school-mango/50 bg-gradient-to-br from-white to-school-mango/15 hover:border-school-mango hover:shadow-school',
  support: 'border-school-leaf/50 bg-gradient-to-br from-white to-school-leaf/10 hover:border-school-leaf hover:shadow-school',
  activity: 'border-school-grape/50 bg-gradient-to-br from-white to-school-grape/10 hover:border-school-grape hover:shadow-school',
  meeting: 'border-school-bubblegum/50 bg-gradient-to-br from-white to-school-bubblegum/10 hover:border-school-bubblegum hover:shadow-school',
}

const SESSION_EMOJI: Record<string, string> = {
  course: '📘',
  exam: '📝',
  support: '🤝',
  activity: '🎨',
  meeting: '💬',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  cancelled: 'Annulé',
}

const STATUS_PILL: Record<string, string> = {
  draft: 'school-pill-sun',
  published: 'school-pill-green',
  cancelled: 'school-pill-coral',
}

const DAY_HEADER: Record<string, string> = {
  monday: 'bg-school-sky/15 text-school-skydeep',
  tuesday: 'bg-school-grape/15 text-school-grape',
  wednesday: 'bg-school-leaf/15 text-school-leafdeep',
  thursday: 'bg-school-mango/15 text-[#92400E]',
  friday: 'bg-school-bubblegum/15 text-[#C2185B]',
  saturday: 'bg-school-mint/15 text-[#0D7377]',
  sunday: 'bg-school-coral/15 text-[#B23A2E]',
}

function mondayDateString(d: Date): string {
  const x = new Date(d)
  const day = x.getDay()
  const diff = x.getDate() - day + (day === 0 ? -6 : 1)
  x.setDate(diff)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const dayNum = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${dayNum}`
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(`${weekStart}T12:00:00`)
  const end = new Date(`${weekEnd}T12:00:00`)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.getDate()} ${end.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
  }
  return `${start.toLocaleDateString('fr-FR', opts)} – ${end.toLocaleDateString('fr-FR', { ...opts, year: 'numeric' })}`
}

function dayDateLabel(weekStart: string, dayIndex: number): string {
  const d = new Date(`${weekStart}T12:00:00`)
  d.setDate(d.getDate() + dayIndex)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function isTodayColumn(weekStart: string, dayIndex: number): boolean {
  const d = new Date(`${weekStart}T12:00:00`)
  d.setDate(d.getDate() + dayIndex)
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

export function ScheduleWeeklyPage() {
  const { user, hasPermission } = useAuth()
  const canManage = hasPermission('schedule.manage')
  const isTeacher = isTeacherRole(user?.role?.code)
  const canListYears = hasPermission('school_years.view')
  const { id: currentYearId, name: currentYearName } = useCurrentSchoolYear()
  const queryClient = useQueryClient()

  const [weekStart, setWeekStart] = useState(() => mondayDateString(new Date()))
  const [schoolYearId, setSchoolYearId] = useState(0)
  const [filterClassId, setFilterClassId] = useState(0)
  const [filterTeacherId, setFilterTeacherId] = useState(0)
  const [filterRoomId, setFilterRoomId] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [conflicts, setConflicts] = useState<scheduleApi.ScheduleConflict[]>([])
  const [formErr, setFormErr] = useState<string | null>(null)

  const [classId, setClassId] = useState(0)
  const [subjectId, setSubjectId] = useState(0)
  const [teacherId, setTeacherId] = useState(0)
  const [roomId, setRoomId] = useState(0)
  const [dayOfWeek, setDayOfWeek] = useState<string>('monday')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('09:00')
  const [sessionType, setSessionType] = useState('course')
  const [effStart, setEffStart] = useState('')
  const [effEnd, setEffEnd] = useState('')
  const [status, setStatus] = useState('published')
  const [notes, setNotes] = useState('')

  const { data: years } = useQuery({
    queryKey: ['school-years-all'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 100,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
    enabled: canListYears,
  })

  useEffect(() => {
    if (schoolYearId > 0) return
    if (canListYears && years?.items?.length) {
      const cur = years.items.find((y) => y.is_current)
      if (cur) setSchoolYearId(cur.id)
      return
    }
    if (!canListYears && currentYearId) {
      setSchoolYearId(currentYearId)
    }
  }, [years, schoolYearId, canListYears, currentYearId])

  const { data: weekly, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      'schedule-weekly',
      schoolYearId,
      weekStart,
      filterClassId,
      filterTeacherId,
      filterRoomId,
    ],
    queryFn: () =>
      scheduleApi.fetchWeeklySchedule({
        school_year_id: schoolYearId,
        week_start: weekStart,
        class_id: filterClassId || undefined,
        teacher_id: filterTeacherId || undefined,
        room_id: filterRoomId || undefined,
      }),
    enabled: schoolYearId > 0,
  })

  const { data: classes } = useQuery({
    queryKey: ['classes-schedule', schoolYearId],
    queryFn: () =>
      classesApi.fetchClasses({
        per_page: 100,
        school_year_id: schoolYearId,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
  })

  const { data: subjects } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: () =>
      subjectsApi.fetchSubjects({
        per_page: 500,
        sort_by: 'name',
        sort_order: 'asc',
      }),
  })

  const { data: teachers } = useQuery({
    queryKey: ['teachers-schedule'],
    queryFn: () =>
      teachersApi.fetchTeachers({
        per_page: 200,
        sort_by: 'last_name',
        sort_order: 'asc',
      }),
  })

  const { data: rooms } = useQuery({
    queryKey: ['rooms-all'],
    queryFn: () =>
      roomsApi.fetchRooms({
        per_page: 200,
        sort_by: 'name',
        sort_order: 'asc',
      }),
  })

  const save = useMutation({
    mutationFn: async () => {
      const payload: scheduleApi.ScheduleEntryPayload = {
        school_year_id: schoolYearId,
        term_id: null,
        class_id: classId,
        subject_id: subjectId,
        teacher_id: teacherId,
        room_id: roomId || null,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        session_type: sessionType,
        effective_start_date: effStart || null,
        effective_end_date: effEnd || null,
        status,
        notes: notes || null,
      }
      setConflicts([])
      setFormErr(null)
      if (editingId) {
        return scheduleApi.updateScheduleEntry(editingId, payload)
      }
      return scheduleApi.createScheduleEntry(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-weekly'] })
      setFormOpen(false)
      setEditingId(null)
      setConflicts([])
    },
    onError: (e: unknown) => {
      if (isAxiosError(e) && e.response?.status === 422) {
        const d = e.response.data as {
          conflicts?: scheduleApi.ScheduleConflict[]
        }
        setConflicts(d.conflicts ?? [])
      }
      setFormErr(getApiErrorMessage(e, 'Conflit ou validation impossible.'))
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => scheduleApi.deleteScheduleEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-weekly'] })
      setFormOpen(false)
      setEditingId(null)
    },
  })

  function openNew(prefDay?: string) {
    setEditingId(null)
    setConflicts([])
    setFormErr(null)
    setClassId(0)
    setSubjectId(0)
    setTeacherId(0)
    setRoomId(0)
    setDayOfWeek(prefDay ?? 'monday')
    setStartTime('08:00')
    setEndTime('09:00')
    setSessionType('course')
    setEffStart('')
    setEffEnd('')
    setStatus('published')
    setNotes('')
    setFormOpen(true)
  }

  function openEdit(entry: scheduleApi.ScheduleEntryDto) {
    setEditingId(entry.id)
    setConflicts([])
    setFormErr(null)
    setClassId(entry.class_id)
    setSubjectId(entry.subject_id)
    setTeacherId(entry.teacher_id)
    setRoomId(entry.room_id ?? 0)
    setDayOfWeek(entry.day_of_week)
    setStartTime(entry.start_time.slice(0, 5))
    setEndTime(entry.end_time.slice(0, 5))
    setSessionType(entry.session_type)
    setEffStart(entry.effective_start_date ?? '')
    setEffEnd(entry.effective_end_date ?? '')
    setStatus(entry.status)
    setNotes(entry.notes ?? '')
    setFormOpen(true)
  }

  const weekLabel = useMemo(() => {
    if (!weekly) return ''
    return formatWeekRange(weekly.week_start, weekly.week_end)
  }, [weekly])

  const stats = useMemo(() => {
    if (!weekly) return { total: 0, activeDays: 0, published: 0 }
    let total = 0
    let activeDays = 0
    let published = 0
    for (const d of DOW) {
      const items = weekly.days[d] ?? []
      if (items.length > 0) activeDays++
      total += items.length
      published += items.filter((e) => e.status === 'published').length
    }
    return { total, activeDays, published }
  }, [weekly])

  const hasActiveFilters = filterClassId > 0 || filterTeacherId > 0 || filterRoomId > 0

  function goToCurrentWeek() {
    setWeekStart(mondayDateString(new Date()))
  }

  function shiftWeek(delta: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(mondayDateString(d))
  }

  return (
    <div className="space-y-5">
      <PageHeader
        emoji="📅"
        title={isTeacher ? 'Mon emploi du temps' : 'Emploi du temps'}
        subtitle="Planning hebdomadaire des cours, salles et enseignants."
        actions={
          <>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching || schoolYearId <= 0}
              className="school-btn-secondary"
              title="Actualiser"
            >
              {isFetching ? 'Actualisation…' : '↻ Actualiser'}
            </button>
            {canManage && (
              <button type="button" onClick={() => openNew()} className="school-btn-primary">
                + Nouveau créneau
              </button>
            )}
          </>
        }
      />

      {/* Week hero strip */}
      <div className="school-hero !from-[#0D7377] !via-school-skydeep !to-school-grape">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              Semaine en cours
            </p>
            <p className="mt-1 font-display text-xl font-bold sm:text-2xl">
              {weekLabel || '—'}
            </p>
            {weekly?.school_year?.name && (
              <span className="school-chip-on-dark mt-2 inline-flex">
                {weekly.school_year.name}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              className="rounded-2xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              ← Préc.
            </button>
            <button
              type="button"
              onClick={goToCurrentWeek}
              className="rounded-2xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              className="rounded-2xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              Suiv. →
            </button>
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      {weekly && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="school-tile school-accent-mint">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  Créneaux
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-school-ink">
                  {stats.total}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-mint/15 text-2xl">
                📅
              </div>
            </div>
          </div>
          <div className="school-tile school-accent-blue">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  Jours actifs
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-school-ink">
                  {stats.activeDays}
                  <span className="text-lg text-school-inkmuted"> / 7</span>
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-sky/15 text-2xl">
                📆
              </div>
            </div>
          </div>
          <div className="school-tile school-accent-green">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  Publiés
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-school-leafdeep">
                  {stats.published}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-leaf/15 text-2xl">
                ✅
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="school-section">
        <SectionTitle
          emoji="🔎"
          title="Filtres"
          hint="Affinez l'affichage par année, classe, enseignant ou salle."
          iconClassName="bg-school-mist text-school-skydeep"
          actions={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setFilterClassId(0)
                  setFilterTeacherId(0)
                  setFilterRoomId(0)
                }}
                className="school-btn-secondary !py-1.5 !text-xs"
              >
                Réinitialiser
              </button>
            ) : null
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Année scolaire
            </span>
            {canListYears ? (
              <select
                value={schoolYearId || ''}
                onChange={(e) => setSchoolYearId(parseInt(e.target.value, 10) || 0)}
                className="school-select"
              >
                <option value={0}>—</option>
                {years?.items.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                    {y.is_current ? ' (courante)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="school-select bg-school-cream/50 font-semibold">
                {currentYearName ?? '—'}
              </p>
            )}
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Semaine (lundi)
            </span>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(mondayDateString(new Date(e.target.value)))}
              className="school-input"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Classe
            </span>
            <select
              value={filterClassId || ''}
              onChange={(e) => setFilterClassId(parseInt(e.target.value, 10) || 0)}
              className="school-select"
            >
              <option value={0}>Toutes les classes</option>
              {classes?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {!isTeacher ? (
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Enseignant
              </span>
              <select
                value={filterTeacherId || ''}
                onChange={(e) => setFilterTeacherId(parseInt(e.target.value, 10) || 0)}
                className="school-select"
              >
                <option value={0}>Tous les enseignants</option>
                {teachers?.items.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.last_name} {t.first_name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Salle
            </span>
            <select
              value={filterRoomId || ''}
              onChange={(e) => setFilterRoomId(parseInt(e.target.value, 10) || 0)}
              className="school-select"
            >
              <option value={0}>Toutes les salles</option>
              {rooms?.items.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {!formOpen && conflicts.length > 0 && (
        <div className="rounded-3xl border-2 border-school-mango/40 bg-school-mango/10 px-5 py-4 text-sm font-semibold text-[#92400E]">
          <p className="font-display text-base font-bold">⚠️ Conflits détectés</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {conflicts.map((c) => (
              <li key={`${c.code}-${c.conflicting_entry_id}`}>{c.message}</li>
            ))}
          </ul>
        </div>
      )}

      {!formOpen && formErr && !conflicts.length && (
        <p className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
          ✕ {formErr}
        </p>
      )}

      {isLoading && <LoadingState label="Chargement du planning…" lines={4} />}
      {isError && (
        <ErrorState
          error={error}
          fallback="Impossible de charger l'emploi du temps."
          onRetry={() => void refetch()}
        />
      )}

      {weekly && !isLoading && (
        <section className="school-section">
          <SectionTitle
            emoji="🗓️"
            title="Planning de la semaine"
            hint={hasActiveFilters ? 'Résultats filtrés' : 'Tous les créneaux de la semaine'}
            iconClassName="bg-school-mint/20 text-[#0D7377]"
          />

          {stats.total === 0 ? (
            <EmptyState
              emoji="📭"
              title="Aucun créneau cette semaine"
              hint={
                hasActiveFilters
                  ? 'Essayez d’élargir les filtres ou créez un nouveau créneau.'
                  : 'Commencez par ajouter des créneaux pour organiser la semaine.'
              }
              action={
                canManage ? (
                  <button type="button" onClick={() => openNew()} className="school-btn-primary">
                    + Nouveau créneau
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="grid min-w-[980px] grid-cols-7 gap-3">
                {DOW.map((d, dayIndex) => {
                  const entries = weekly.days[d] ?? []
                  const today = isTodayColumn(weekStart, dayIndex)
                  return (
                    <div key={d} className="flex min-w-[130px] flex-col">
                      <div
                        className={`mb-2 rounded-2xl border-2 px-3 py-2.5 text-center transition ${
                          today
                            ? 'border-school-grape bg-gradient-to-br from-school-grape/20 to-school-bubblegum/10 shadow-school'
                            : `border-school-line ${DAY_HEADER[d]}`
                        }`}
                      >
                        <p className="font-display text-sm font-bold">{DOW_FR[d]}</p>
                        <p className="text-[11px] font-semibold opacity-80">
                          {dayDateLabel(weekStart, dayIndex)}
                        </p>
                        {today && (
                          <span className="mt-1 inline-block rounded-full bg-school-grape px-2 py-0.5 text-[10px] font-bold text-white">
                            Aujourd&apos;hui
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col gap-2 rounded-2xl border-2 border-dashed border-school-line/80 bg-school-cream/30 p-2 min-h-[200px]">
                        {entries.length === 0 ? (
                          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-6 text-center">
                            <span className="text-2xl opacity-40">—</span>
                            <p className="text-[11px] font-semibold text-school-inkmuted">Libre</p>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => openNew(d)}
                                className="mt-1 text-[11px] font-bold text-school-grape hover:underline"
                              >
                                + Ajouter
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            {entries.map((e) => {
                              const cardClass =
                                SESSION_CARD[e.session_type] ?? SESSION_CARD.course
                              const inner = (
                                <>
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="text-base leading-none">
                                      {SESSION_EMOJI[e.session_type] ?? '📘'}
                                    </span>
                                    <span
                                      className={`${STATUS_PILL[e.status] ?? 'school-pill-muted'} !text-[9px]`}
                                    >
                                      {STATUS_LABELS[e.status] ?? e.status}
                                    </span>
                                  </div>
                                  <p className="mt-1.5 font-mono text-xs font-bold text-school-ink">
                                    {e.start_time.slice(0, 5)} – {e.end_time.slice(0, 5)}
                                  </p>
                                  <p className="mt-0.5 font-display text-sm font-bold leading-tight text-school-ink">
                                    {e.subject?.name}
                                  </p>
                                  <p className="text-xs font-semibold text-school-inkmuted">
                                    {e.school_class?.name}
                                  </p>
                                  {!isTeacher && e.teacher && (
                                    <p className="text-[11px] text-school-inkmuted">
                                      {e.teacher.last_name} {e.teacher.first_name?.[0]}.
                                    </p>
                                  )}
                                  {e.room?.name && (
                                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-school-skydeep">
                                      🚪 {e.room.name}
                                    </p>
                                  )}
                                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-school-inkmuted/70">
                                    {SESSION_LABELS[e.session_type] ?? e.session_type}
                                  </p>
                                </>
                              )
                              return canManage ? (
                                <button
                                  key={e.id}
                                  type="button"
                                  onClick={() => openEdit(e)}
                                  className={`w-full rounded-2xl border-2 p-2.5 text-left transition ${cardClass}`}
                                >
                                  {inner}
                                </button>
                              ) : (
                                <div
                                  key={e.id}
                                  className={`rounded-2xl border-2 p-2.5 ${cardClass}`}
                                >
                                  {inner}
                                </div>
                              )
                            })}
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => openNew(d)}
                                className="mt-auto rounded-xl border-2 border-dashed border-school-grape/40 py-1.5 text-[11px] font-bold text-school-grape transition hover:border-school-grape hover:bg-school-grape/5"
                              >
                                + Créneau
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {formOpen && canManage && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8 sm:pt-12"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setFormOpen(false)
              setEditingId(null)
              setConflicts([])
            }
          }}
        >
          <div className="w-full max-w-lg rounded-3xl border-2 border-school-line bg-school-bg shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b-2 border-school-line bg-gradient-to-r from-school-mint/10 via-school-sky/10 to-school-grape/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                  {editingId ? '✏️' : '➕'}
                </span>
                <h3 className="font-display text-lg font-bold text-school-ink">
                  {editingId ? 'Modifier le créneau' : 'Nouveau créneau'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false)
                  setEditingId(null)
                  setConflicts([])
                }}
                className="rounded-xl border-2 border-school-line bg-white px-3 py-1 text-sm font-semibold text-school-inkmuted hover:bg-school-cream"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                    Classe *
                  </span>
                  <select
                    value={classId || ''}
                    onChange={(e) => setClassId(parseInt(e.target.value, 10) || 0)}
                    className="school-select"
                  >
                    <option value={0}>— Choisir —</option>
                    {classes?.items.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                    Matière *
                  </span>
                  <select
                    value={subjectId || ''}
                    onChange={(e) => setSubjectId(parseInt(e.target.value, 10) || 0)}
                    className="school-select"
                  >
                    <option value={0}>—</option>
                    {subjects?.items.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                    Enseignant *
                  </span>
                  <select
                    value={teacherId || ''}
                    onChange={(e) => setTeacherId(parseInt(e.target.value, 10) || 0)}
                    className="school-select"
                  >
                    <option value={0}>—</option>
                    {teachers?.items.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.last_name} {t.first_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                    Salle
                  </span>
                  <select
                    value={roomId || ''}
                    onChange={(e) => setRoomId(parseInt(e.target.value, 10) || 0)}
                    className="school-select"
                  >
                    <option value={0}>— Aucune —</option>
                    {rooms?.items.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                    Jour *
                  </span>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="school-select"
                  >
                    {DOW.map((d) => (
                      <option key={d} value={d}>
                        {DOW_FR[d]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                    Début *
                  </span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="school-input"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                    Fin *
                  </span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="school-input"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                    Type de séance
                  </span>
                  <select
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value)}
                    className="school-select"
                  >
                    {Object.entries(SESSION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                    Statut
                  </span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="school-select"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                    Début de validité
                  </span>
                  <input
                    type="date"
                    value={effStart}
                    onChange={(e) => setEffStart(e.target.value)}
                    className="school-input"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                    Fin de validité
                  </span>
                  <input
                    type="date"
                    value={effEnd}
                    onChange={(e) => setEffEnd(e.target.value)}
                    className="school-input"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                    Notes
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="school-input resize-none"
                  />
                </label>
              </div>

              {formErr && conflicts.length === 0 && (
                <div className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
                  ✕ {formErr}
                </div>
              )}
              {conflicts.length > 0 && (
                <div className="rounded-2xl border-2 border-school-mango/40 bg-school-mango/10 p-4 text-sm font-semibold text-[#92400E]">
                  <p className="font-display font-bold">⚠️ Conflit détecté</p>
                  <ul className="mt-2 list-inside list-disc">
                    {conflicts.map((c) => (
                      <li key={`f-${c.code}-${c.conflicting_entry_id}`}>{c.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t-2 border-school-line pt-4">
                <button
                  type="button"
                  onClick={() => save.mutate()}
                  disabled={
                    save.isPending ||
                    !classId ||
                    !subjectId ||
                    !teacherId ||
                    schoolYearId <= 0
                  }
                  className="school-btn-primary"
                >
                  {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Supprimer ce créneau ?')) {
                        remove.mutate(editingId)
                      }
                    }}
                    className="rounded-2xl border-2 border-school-coral/60 bg-white px-4 py-2 text-sm font-bold text-[#B23A2E] transition hover:bg-school-coral/10"
                  >
                    Supprimer
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false)
                    setEditingId(null)
                    setConflicts([])
                  }}
                  className="school-btn-secondary"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
