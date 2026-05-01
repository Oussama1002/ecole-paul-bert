import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as schoolYearsApi from '../../api/schoolYears'
import { useAuth } from '../../contexts/AuthContext'

const statusLabels: Record<string, string> = {
  planned: 'Planifiée',
  active: 'Active',
  closed: 'Clôturée',
}

export function SchoolYearsListPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')

  const canManage = hasPermission('school_years.manage')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['school-years', page, status],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        page,
        per_page: 15,
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-slate-800">
          Années scolaires
        </h2>
        {canManage && (
          <Link
            to="/parametrage/annees-scolaires/nouveau"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Nouvelle année
          </Link>
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
