import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as schoolYearsApi from '../../api/schoolYears'
import { useAuth } from '../../contexts/AuthContext'
import { getApiErrorMessage } from '../../utils/apiError'

const statusLabels: Record<string, string> = {
  planned: 'Planifiée',
  active: 'Active',
  closed: 'Clôturée',
}

function nextYearSuggestion(items: schoolYearsApi.SchoolYear[]) {
  let latestEndYear = new Date().getFullYear()
  for (const y of items) {
    const m = y.name.match(/(\d{4})-(\d{4})/)
    if (m) {
      const endY = parseInt(m[2], 10)
      if (endY > latestEndYear) latestEndYear = endY
    } else {
      const m2 = y.end_date?.match(/^(\d{4})/)
      if (m2) {
        const endY = parseInt(m2[1], 10)
        if (endY > latestEndYear) latestEndYear = endY
      }
    }
  }
  const startYear = latestEndYear
  const endYear = latestEndYear + 1
  return {
    name: `${startYear}-${endYear}`,
    start_date: `${startYear}-09-01`,
    end_date: `${endYear}-06-30`,
    status: 'planned' as const,
  }
}

function GenerateYearModal({
  items,
  onClose,
  onSuccess,
}: {
  items: schoolYearsApi.SchoolYear[]
  onClose: () => void
  onSuccess: () => void
}) {
  const suggestion = nextYearSuggestion(items)
  const [name, setName] = useState(suggestion.name)
  const [startDate, setStartDate] = useState(suggestion.start_date)
  const [endDate, setEndDate] = useState(suggestion.end_date)
  const [status, setStatus] = useState<string>('planned')
  const [error, setError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () =>
      schoolYearsApi.createSchoolYear({
        name,
        start_date: startDate,
        end_date: endDate,
        status,
      }),
    onSuccess: () => {
      onSuccess()
      onClose()
    },
    onError: (e: Error) => setError(getApiErrorMessage(e, 'Erreur lors de la création.')),
  })

  const inputCls = 'w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold text-slate-800">
          Générer l'année scolaire
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          Modifiez si besoin puis cliquez sur <strong>Générer</strong>.
        </p>

        <div className="mb-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Nom</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="2027-2028"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Date de début</span>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Date de fin</span>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Statut</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputCls}
            >
              <option value="planned">Planifiée</option>
              <option value="active">Active</option>
              <option value="closed">Clôturée</option>
            </select>
          </label>
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {create.isPending ? 'Création…' : 'Générer'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

export function SchoolYearsListPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [showModal, setShowModal] = useState(false)

  const canManage = hasPermission('school_years.manage')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['school-years', page, status],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        page,
        per_page: 100,
        status: status || undefined,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
  })

  const setCurrent = useMutation({
    mutationFn: (id: number) => schoolYearsApi.setSchoolYearCurrent(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['school-years'] }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => schoolYearsApi.deleteSchoolYear(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['school-years'] }),
  })

  return (
    <div>
      {showModal && data && (
        <GenerateYearModal
          items={data.items}
          onClose={() => setShowModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['school-years'] })}
        />
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-slate-800">
          Années scolaires
        </h2>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Générer une année
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label>
          <span className="mb-1 block text-xs text-slate-500">Statut</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            <option value="planned">Planifiée</option>
            <option value="active">Active</option>
            <option value="closed">Clôturée</option>
          </select>
        </label>
      </div>

      {isLoading && (
        <p className="text-sm text-slate-500">Chargement…</p>
      )}
      {isError && (
        <p className="text-sm text-red-600">
          {(error as Error).message ?? 'Erreur'}
        </p>
      )}

      {data && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-700">
                  Nom
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">
                  Début
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">
                  Fin
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">
                  Statut
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">
                  Courante
                </th>
                <th className="px-4 py-2 text-right font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((y) => (
                <tr key={y.id}>
                  <td className="px-4 py-2 font-medium text-slate-800">
                    {y.name}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{y.start_date}</td>
                  <td className="px-4 py-2 text-slate-600">{y.end_date}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {statusLabels[y.status] ?? y.status}
                  </td>
                  <td className="px-4 py-2">
                    {y.is_current ? (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        Oui
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {canManage && !y.is_current && (
                        <button
                          type="button"
                          onClick={() => setCurrent.mutate(y.id)}
                          disabled={setCurrent.isPending}
                          className="text-xs font-medium text-indigo-600 hover:underline"
                        >
                          Définir active
                        </button>
                      )}
                      {canManage && (
                        <Link
                          to={`/parametrage/annees-scolaires/${y.id}/editer`}
                          className="text-xs font-medium text-slate-600 hover:underline"
                        >
                          Modifier
                        </Link>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                'Supprimer cette année scolaire ?'
                              )
                            ) {
                              remove.mutate(y.id)
                            }
                          }}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-sm text-indigo-600 disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-xs text-slate-500">
                Page {data.meta.current_page} / {data.meta.last_page}
              </span>
              <button
                type="button"
                disabled={page >= data.meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="text-sm text-indigo-600 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
