import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom'
import * as schoolYearsApi from '../../api/schoolYears'

export function SchoolYearFormPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = !!matchPath(
    '/parametrage/annees-scolaires/nouveau',
    pathname
  )
  const editMatch = matchPath(
    '/parametrage/annees-scolaires/:id/editer',
    pathname
  )
  const id = editMatch?.params?.id ? parseInt(editMatch.params.id, 10) : NaN

  const { data: existing, isLoading } = useQuery({
    queryKey: ['school-year', id],
    queryFn: () => schoolYearsApi.fetchSchoolYear(id),
    enabled: !isNew && !Number.isNaN(id),
  })

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('planned')
  const [isCurrent, setIsCurrent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setStartDate(existing.start_date)
    setEndDate(existing.end_date)
    setStatus(existing.status)
    setIsCurrent(existing.is_current)
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      if (isNew) {
        return schoolYearsApi.createSchoolYear({
          name,
          start_date: startDate,
          end_date: endDate,
          status,
          is_current: isCurrent,
        })
      }
      return schoolYearsApi.updateSchoolYear(id, {
        name,
        start_date: startDate,
        end_date: endDate,
        status,
        is_current: isCurrent,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] })
      navigate('/parametrage/annees-scolaires')
    },
    onError: (e: Error) => setError(e.message),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    save.mutate()
  }

  if (!isNew && isLoading) {
    return <p className="text-sm text-slate-500">Chargement…</p>
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/parametrage/annees-scolaires"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Années scolaires
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-slate-800">
          {isNew ? 'Nouvelle année scolaire' : 'Modifier l’année scolaire'}
        </h2>
      </div>

      <form
        onSubmit={onSubmit}
        className="max-w-lg space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
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
          <span className="mb-1 block text-xs text-slate-500">
            Date de début
          </span>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Date de fin</span>
          <input
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Statut</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="planned">Planifiée</option>
            <option value="active">Active</option>
            <option value="closed">Clôturée</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isCurrent}
            onChange={(e) => setIsCurrent(e.target.checked)}
          />
          <span className="text-sm text-slate-700">Année courante</span>
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
            to="/parametrage/annees-scolaires"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
