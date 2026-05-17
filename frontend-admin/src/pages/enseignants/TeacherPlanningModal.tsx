import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import * as classesApi from '../../api/classes'
import * as roomsApi from '../../api/rooms'
import * as scheduleApi from '../../api/schedule'
import * as subjectsApi from '../../api/subjects'
import type { ScheduleEntry } from '../../api/teachers'
import { getApiErrorMessage } from '../../utils/apiError'

const DAYS = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' },
]

const SESSION_TYPES = [
  { value: 'course', label: 'Cours' },
  { value: 'exam', label: 'Examen' },
  { value: 'support', label: 'Soutien' },
  { value: 'activity', label: 'Activité' },
  { value: 'meeting', label: 'Réunion' },
]

const hhmm = (t: string) => (t ? t.slice(0, 5) : '')

export function TeacherPlanningModal({
  teacherId,
  entry,
  defaultSchoolYearId,
  years,
  onClose,
}: {
  teacherId: number
  entry: ScheduleEntry | null
  defaultSchoolYearId: number
  years: { id: number; name: string }[]
  onClose: () => void
}) {
  const isNew = entry === null
  const queryClient = useQueryClient()

  const [schoolYearId, setSchoolYearId] = useState<number>(
    entry?.school_year_id || defaultSchoolYearId || years[0]?.id || 0
  )
  const [classId, setClassId] = useState<number>(entry?.school_class?.id ?? 0)
  const [subjectId, setSubjectId] = useState<number>(entry?.subject?.id ?? 0)
  const [roomId, setRoomId] = useState<number>(entry?.room?.id ?? 0)
  const [dayOfWeek, setDayOfWeek] = useState<string>(entry?.day_of_week ?? 'monday')
  const [startTime, setStartTime] = useState<string>(hhmm(entry?.start_time ?? '08:00'))
  const [endTime, setEndTime] = useState<string>(hhmm(entry?.end_time ?? '09:00'))
  const [sessionType, setSessionType] = useState<string>(entry?.session_type ?? 'course')
  const [error, setError] = useState<string | null>(null)

  const { data: classes } = useQuery({
    queryKey: ['planning-classes', schoolYearId],
    queryFn: () => classesApi.fetchClasses({ school_year_id: schoolYearId || undefined, per_page: 100 }),
    enabled: schoolYearId > 0,
  })

  const { data: subjects } = useQuery({
    queryKey: ['planning-subjects'],
    queryFn: () => subjectsApi.fetchSubjects({ per_page: 100 }),
  })

  const { data: rooms } = useQuery({
    queryKey: ['planning-rooms'],
    queryFn: () => roomsApi.fetchRooms({ per_page: 100 }),
  })

  const save = useMutation({
    mutationFn: async () => {
      if (!schoolYearId) throw new Error('Année scolaire requise.')
      if (!classId) throw new Error('Classe requise.')
      if (!subjectId) throw new Error('Matière requise.')
      const payload: scheduleApi.ScheduleEntryPayload = {
        school_year_id: schoolYearId,
        class_id: classId,
        subject_id: subjectId,
        teacher_id: teacherId,
        room_id: roomId || null,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        session_type: sessionType,
      }
      if (isNew) return scheduleApi.createScheduleEntry(payload)
      return scheduleApi.updateScheduleEntry(entry!.id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-schedule'] })
      onClose()
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Enregistrement du créneau impossible.')),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-school-border/70 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-school-line bg-white px-6 py-4">
          <h3 className="font-display text-lg font-bold text-school-ink">
            {isNew ? 'Nouveau créneau' : 'Modifier le créneau'}
          </h3>
          <button type="button" onClick={onClose} className="text-xl leading-none text-school-inkmuted hover:text-school-ink">✕</button>
        </div>

        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); setError(null); save.mutate() }}
          className="space-y-4 p-6"
        >
          {error && (
            <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">{error}</p>
          )}

          <Field label="Année scolaire *">
            <select
              required
              value={schoolYearId || ''}
              onChange={(e) => { setSchoolYearId(Number(e.target.value)); setClassId(0) }}
              className="school-select"
            >
              <option value="">—</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Classe *">
              <select required value={classId || ''} onChange={(e) => setClassId(Number(e.target.value))} className="school-select">
                <option value="">—</option>
                {classes?.items.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Matière *">
              <select required value={subjectId || ''} onChange={(e) => setSubjectId(Number(e.target.value))} className="school-select">
                <option value="">—</option>
                {subjects?.items.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Salle">
              <select value={roomId || ''} onChange={(e) => setRoomId(Number(e.target.value))} className="school-select">
                <option value="">— Aucune —</option>
                {rooms?.items.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Jour *">
              <select required value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} className="school-select">
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Début *">
              <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="school-input" />
            </Field>
            <Field label="Fin *">
              <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="school-input" />
            </Field>
            <Field label="Type de séance" className="sm:col-span-2">
              <select value={sessionType} onChange={(e) => setSessionType(e.target.value)} className="school-select">
                {SESSION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="school-btn-secondary">Annuler</button>
            <button type="submit" disabled={save.isPending} className="school-btn-primary disabled:opacity-60">
              {save.isPending ? 'Enregistrement…' : isNew ? 'Ajouter le créneau' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">{label}</span>
      {children}
    </label>
  )
}
