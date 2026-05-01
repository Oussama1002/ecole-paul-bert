import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom'
import * as classesApi from '../../api/classes'
import * as levelsApi from '../../api/levels'
import * as schoolYearsApi from '../../api/schoolYears'

export function ClassFormPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = !!matchPath('/parametrage/classes/nouveau', pathname)
  const editMatch = matchPath('/parametrage/classes/:id/editer', pathname)
  const id = editMatch?.params?.id ? parseInt(editMatch.params.id, 10) : NaN

  const { data: existing, isLoading } = useQuery({
    queryKey: ['class', id],
    queryFn: () => classesApi.fetchClass(id),
    enabled: !isNew && !Number.isNaN(id),
  })

  const { data: years } = useQuery({
    queryKey: ['school-years-all'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 100,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
  })

  const { data: levels } = useQuery({
    queryKey: ['levels-all'],
    queryFn: () =>
      levelsApi.fetchLevels({ per_page: 200, sort_by: 'sort_order', sort_order: 'asc' }),
  })

  const [levelId, setLevelId] = useState(0)
  const [schoolYearId, setSchoolYearId] = useState(0)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
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
    setCode(existing.code)
    setSection(existing.section ?? '')
    setMaxStudents(
      existing.max_students != null ? String(existing.max_students) : ''
    )
    setRoomLabel(existing.room_label ?? '')
    setMainTeacherId(
      existing.main_teacher_id != null ? String(existing.main_teacher_id) : ''
    )
    setStatus(existing.status)
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      const payload: classesApi.ClassPayload = {
        level_id: levelId,
        school_year_id: schoolYearId,
        name,
        code,
        section: section || null,
        max_students: maxStudents ? parseInt(maxStudents, 10) : null,
        room_label: roomLabel || null,
        main_teacher_id: mainTeacherId ? parseInt(mainTeacherId, 10) : null,
        status,
      }
      if (isNew) {
        return classesApi.createClass(payload)
      }
      return classesApi.updateClass(id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      navigate('/parametrage/classes')
    },
    onError: (e: Error) => setError(e.message),
  })

  if (!isNew && isLoading) {
    return <p className="text-sm text-slate-500">Chargement…</p>
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/parametrage/classes"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Classes
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-slate-800">
          {isNew ? 'Nouvelle classe' : 'Modifier la classe'}
        </h2>
      </div>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          setError(null)
          save.mutate()
        }}
        className="max-w-lg space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && <p className="text-sm text-red-600">{error}</p>}
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Année scolaire</span>
          <select
            required
            value={schoolYearId || ''}
            onChange={(e) => setSchoolYearId(Number(e.target.value))}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {years?.items.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Niveau</span>
          <select
            required
            value={levelId || ''}
            onChange={(e) => setLevelId(Number(e.target.value))}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {levels?.items.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Nom</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Code (unique par année)</span>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Section</span>
          <input
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Effectif max</span>
          <input
            type="number"
            min={1}
            value={maxStudents}
            onChange={(e) => setMaxStudents(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Libellé salle</span>
          <input
            value={roomLabel}
            onChange={(e) => setRoomLabel(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">
            ID enseignant principal (optionnel)
          </span>
          <input
            type="number"
            min={1}
            value={mainTeacherId}
            onChange={(e) => setMainTeacherId(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="ex. 1"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Statut</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archivée</option>
          </select>
        </label>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            Enregistrer
          </button>
          <Link
            to="/parametrage/classes"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
