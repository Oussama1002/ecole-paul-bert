import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom'
import * as levelsApi from '../../api/levels'
import * as subjectsApi from '../../api/subjects'

export function SubjectFormPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = !!matchPath('/parametrage/matieres/nouveau', pathname)
  const editMatch = matchPath('/parametrage/matieres/:id/editer', pathname)
  const id = editMatch?.params?.id ? parseInt(editMatch.params.id, 10) : NaN

  const { data: existing, isLoading } = useQuery({
    queryKey: ['subject', id],
    queryFn: () => subjectsApi.fetchSubject(id),
    enabled: !isNew && !Number.isNaN(id),
  })

  const { data: levels } = useQuery({
    queryKey: ['levels-all'],
    queryFn: () =>
      levelsApi.fetchLevels({ per_page: 200, sort_by: 'sort_order', sort_order: 'asc' }),
  })

  const [levelId, setLevelId] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coefficient, setCoefficient] = useState('1')
  const [isOptional, setIsOptional] = useState(false)
  const [status, setStatus] = useState('active')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    setLevelId(existing.level_id ?? '')
    setName(existing.name)
    setDescription(existing.description ?? '')
    setCoefficient(String(existing.coefficient))
    setIsOptional(existing.is_optional)
    setStatus(existing.status)
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      const base = {
        name,
        description: description || null,
        coefficient: parseFloat(coefficient) || 1,
        is_optional: isOptional,
        status,
        level_id: levelId === '' ? null : levelId,
      }
      if (isNew) {
        return subjectsApi.createSubject(base)
      }
      return subjectsApi.updateSubject(id, base)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      navigate('/parametrage/matieres')
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
          to="/parametrage/matieres"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Matières
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-slate-800">
          {isNew ? 'Nouvelle matière' : 'Modifier la matière'}
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
          <span className="mb-1 block text-xs text-slate-500">Niveau (optionnel)</span>
          <select
            value={levelId === '' ? '' : levelId}
            onChange={(e) =>
              setLevelId(e.target.value === '' ? '' : Number(e.target.value))
            }
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
          <span className="mb-1 block text-xs text-slate-500">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Coefficient</span>
          <input
            type="number"
            step="0.01"
            min={0}
            value={coefficient}
            onChange={(e) => setCoefficient(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isOptional}
            onChange={(e) => setIsOptional(e.target.checked)}
          />
          <span className="text-sm text-slate-700">Optionnelle</span>
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
            to="/parametrage/matieres"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
