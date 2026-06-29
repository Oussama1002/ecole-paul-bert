import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useEffect, useMemo, useState } from 'react'
import * as classesApi from '../../api/classes'
import * as roomsApi from '../../api/rooms'
import * as scheduleApi from '../../api/schedule'
import * as schoolYearsApi from '../../api/schoolYears'
import * as subjectsApi from '../../api/subjects'
import * as teachersApi from '../../api/teachers'
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

function mondayDateString(d: Date): string {
  const x = new Date(d)
  const day = x.getDay()
  const diff = x.getDate() - day + (day === 0 ? -6 : 1)
  x.setDate(diff)
  return x.toISOString().slice(0, 10)
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

  const { data: weekly, isLoading } = useQuery({
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
    return `${weekly.week_start} → ${weekly.week_end}`
  }, [weekly])

  function shiftWeek(delta: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(mondayDateString(d))
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-slate-800">
          {isTeacher ? 'Mon emploi du temps' : 'Emploi du temps'}
        </h2>
        {canManage && (
          <button
            type="button"
            onClick={() => openNew()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Nouveau créneau
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="block text-xs text-slate-500">Année scolaire</label>
          {canListYears ? (
            <select
              value={schoolYearId || ''}
              onChange={(e) => setSchoolYearId(parseInt(e.target.value, 10) || 0)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            >
              <option value={0}>—</option>
              {years?.items.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-medium text-slate-700">
              {currentYearName ?? '—'}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs text-slate-500">Semaine (lundi)</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(mondayDateString(new Date(e.target.value)))}
            className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            ← Semaine
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            Semaine →
          </button>
        </div>
        <div>
          <label className="block text-xs text-slate-500">Classe</label>
          <select
            value={filterClassId || ''}
            onChange={(e) => setFilterClassId(parseInt(e.target.value, 10) || 0)}
            className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value={0}>Toutes</option>
            {classes?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {!isTeacher ? (
          <div>
            <label className="block text-xs text-slate-500">Enseignant</label>
            <select
              value={filterTeacherId || ''}
              onChange={(e) => setFilterTeacherId(parseInt(e.target.value, 10) || 0)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            >
              <option value={0}>Tous</option>
              {teachers?.items.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.last_name} {t.first_name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <label className="block text-xs text-slate-500">Salle</label>
          <select
            value={filterRoomId || ''}
            onChange={(e) => setFilterRoomId(parseInt(e.target.value, 10) || 0)}
            className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value={0}>Toutes</option>
            {rooms?.items.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mb-2 text-sm text-slate-600">{weekLabel}</p>

      {!formOpen && conflicts.length > 0 && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Conflits détectés</p>
          <ul className="mt-1 list-inside list-disc">
            {conflicts.map((c) => (
              <li key={`${c.code}-${c.conflicting_entry_id}`}>
                {c.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!formOpen && formErr && !conflicts.length && (
        <p className="mb-4 text-sm text-red-600">{formErr}</p>
      )}

      {isLoading && <p className="text-sm text-slate-500">Chargement…</p>}

      {weekly && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                {DOW.map((d) => (
                  <th
                    key={d}
                    className="border-r border-slate-200 px-2 py-2 text-left font-medium text-slate-700"
                  >
                    {DOW_FR[d]}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => openNew(d)}
                        className="ml-2 text-xs text-indigo-600 hover:underline"
                      >
                        + créneau
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {DOW.map((d) => (
                  <td
                    key={d}
                    className="align-top border-r border-slate-100 p-2 align-top"
                  >
                    <div className="flex min-h-[140px] flex-col gap-1">
                      {(weekly.days[d] ?? []).map((e) => {
                        const inner = (
                          <>
                            <div className="font-mono text-slate-800">
                              {e.start_time.slice(0, 5)} – {e.end_time.slice(0, 5)}
                            </div>
                            <div className="text-slate-700">{e.subject?.name}</div>
                            <div className="text-slate-500">{e.school_class?.name}</div>
                            {e.room?.name && (
                              <div className="text-slate-400">Salle {e.room.name}</div>
                            )}
                          </>
                        )
                        return canManage ? (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => openEdit(e)}
                            className="block w-full rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-left text-xs hover:bg-indigo-100"
                          >
                            {inner}
                          </button>
                        ) : (
                          <div
                            key={e.id}
                            className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                          >
                            {inner}
                          </div>
                        )
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {formOpen && canManage && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              {editingId ? 'Modifier le créneau' : 'Nouveau créneau'}
            </h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <label className="text-xs text-slate-500">Classe *</label>
                <select
                  value={classId || ''}
                  onChange={(e) => setClassId(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                >
                  <option value={0}>—</option>
                  {classes?.items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Matière *</label>
                <select
                  value={subjectId || ''}
                  onChange={(e) => setSubjectId(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                >
                  <option value={0}>—</option>
                  {subjects?.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Enseignant *</label>
                <select
                  value={teacherId || ''}
                  onChange={(e) => setTeacherId(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                >
                  <option value={0}>—</option>
                  {teachers?.items.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.last_name} {t.first_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Salle</label>
                <select
                  value={roomId || ''}
                  onChange={(e) => setRoomId(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                >
                  <option value={0}>—</option>
                  {rooms?.items.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Jour *</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                >
                  {DOW.map((d) => (
                    <option key={d} value={d}>
                      {DOW_FR[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500">Début *</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Fin *</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Type de séance</label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                >
                  <option value="course">Cours</option>
                  <option value="exam">Examen</option>
                  <option value="support">Soutien</option>
                  <option value="activity">Activité</option>
                  <option value="meeting">Réunion</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500">Début de validité</label>
                  <input
                    type="date"
                    value={effStart}
                    onChange={(e) => setEffStart(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Fin de validité</label>
                  <input
                    type="date"
                    value={effEnd}
                    onChange={(e) => setEffEnd(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Statut</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                />
              </div>
            </div>
            {formErr && conflicts.length === 0 && (
              <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                ✕ {formErr}
              </div>
            )}
            {conflicts.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="mb-1 font-semibold">⚠️ Conflit détecté</p>
                <ul className="list-inside list-disc">
                  {conflicts.map((c) => (
                    <li key={`f-${c.code}-${c.conflicting_entry_id}`}>{c.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
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
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                Enregistrer
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Supprimer ce créneau ?')) {
                      remove.mutate(editingId)
                    }
                  }}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700"
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
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
