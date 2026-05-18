import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import * as classesApi from '../../api/classes'
import * as levelsApi from '../../api/levels'
import * as schoolYearsApi from '../../api/schoolYears'

export function ClassFormModal({
  classId,
  onClose,
}: {
  classId: number | null
  onClose: () => void
}) {
  const isNew = classId === null
  const queryClient = useQueryClient()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => classesApi.fetchClass(classId as number),
    enabled: !isNew && classId != null,
  })

  const { data: years } = useQuery({
    queryKey: ['school-years-all'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({ per_page: 100, sort_by: 'start_date', sort_order: 'desc' }),
  })

  const { data: levels } = useQuery({
    queryKey: ['levels-all'],
    queryFn: () => levelsApi.fetchLevels({ per_page: 200, sort_by: 'sort_order', sort_order: 'asc' }),
  })

  const [levelId, setLevelId] = useState(0)
  const [schoolYearId, setSchoolYearId] = useState(0)
  const [name, setName] = useState('')
  const [section, setSection] = useState('')
  const [maxStudents, setMaxStudents] = useState('')
  const [roomLabel, setRoomLabel] = useState('')
  const [mainTeacherId, setMainTeacherId] = useState('')
  const [status, setStatus] = useState('active')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    setLevelId(existing.level_id)
    setSchoolYearId(existing.school_year_id)
    setName(existing.name)
    setSection(existing.section ?? '')
    setMaxStudents(existing.max_students != null ? String(existing.max_students) : '')
    setRoomLabel(existing.room_label ?? '')
    setMainTeacherId(existing.main_teacher_id != null ? String(existing.main_teacher_id) : '')
    setStatus(existing.status)
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      const payload: classesApi.ClassPayload = {
        level_id: levelId,
        school_year_id: schoolYearId,
        name,
        section: section || null,
        max_students: maxStudents ? parseInt(maxStudents, 10) : null,
        room_label: roomLabel || null,
        main_teacher_id: mainTeacherId ? parseInt(mainTeacherId, 10) : null,
        status,
      }
      if (isNew) return classesApi.createClass(payload)
      return classesApi.updateClass(classId as number, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-school-border/70 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-school-line bg-white px-6 py-4">
          <h3 className="font-display text-lg font-bold text-school-ink">
            {isNew ? 'Nouvelle classe' : 'Modifier la classe'}
          </h3>
          <button type="button" onClick={onClose} className="text-xl leading-none text-school-inkmuted hover:text-school-ink">✕</button>
        </div>

        {!isNew && isLoading ? (
          <p className="p-6 text-sm text-school-inkmuted">Chargement…</p>
        ) : (
          <form
            onSubmit={(e: FormEvent) => { e.preventDefault(); setError(null); save.mutate() }}
            className="space-y-4 p-6"
          >
            {error && (
              <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">{error}</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Année scolaire *</span>
                <select required value={schoolYearId || ''} onChange={(e) => setSchoolYearId(Number(e.target.value))} className="school-select">
                  <option value="">—</option>
                  {years?.items.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Niveau *</span>
                <select required value={levelId || ''} onChange={(e) => setLevelId(Number(e.target.value))} className="school-select">
                  <option value="">—</option>
                  {levels?.items.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Nom *</span>
                <input required value={name} onChange={(e) => setName(e.target.value)} className="school-input" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Section</span>
                <input value={section} onChange={(e) => setSection(e.target.value)} className="school-input" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Effectif max</span>
                <input type="number" min={1} value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} className="school-input" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Libellé salle</span>
                <input value={roomLabel} onChange={(e) => setRoomLabel(e.target.value)} className="school-input" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">ID enseignant principal</span>
                <input type="number" min={1} value={mainTeacherId} onChange={(e) => setMainTeacherId(e.target.value)} placeholder="optionnel" className="school-input" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Statut</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="school-select">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archivée</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="school-btn-secondary">Annuler</button>
              <button type="submit" disabled={save.isPending} className="school-btn-primary disabled:opacity-60">
                {save.isPending ? 'Enregistrement…' : isNew ? 'Créer la classe' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
