import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as levelsApi from '../../api/levels'
import { useAuth } from '../../contexts/AuthContext'

export function LevelsListPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const canManage = hasPermission('levels.manage')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['levels', page, debounced],
    queryFn: () =>
      levelsApi.fetchLevels({
        page,
        per_page: 25,
        search: debounced || undefined,
        sort_by: 'sort_order',
        sort_order: 'asc',
      }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => levelsApi.deleteLevel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['levels'] }),
  })

  function applySearch(e: React.FormEvent) {
    e.preventDefault()
    setDebounced(search.trim())
    setPage(1)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-slate-800">Niveaux</h2>
        {canManage && (
          <Link
            to="/parametrage/niveaux/nouveau"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Nouveau niveau
          </Link>
        )}
      </div>

      <form
        onSubmit={applySearch}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-xs text-slate-500">Recherche</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800"
        >
          Filtrer
        </button>
      </form>

      {isLoading && <p className="text-sm text-slate-500">Chargement…</p>}
      {isError && (
        <p className="text-sm text-red-600">{(error as Error).message}</p>
      )}

      {data && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left">Ordre</th>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{l.sort_order}</td>
                  <td className="px-4 py-2 font-mono text-slate-700">{l.code}</td>
                  <td className="px-4 py-2 font-medium text-slate-800">
                    {l.name}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canManage && (
                      <>
                        <Link
                          to={`/parametrage/niveaux/${l.id}/editer`}
                          className="mr-3 text-xs text-indigo-600 hover:underline"
                        >
                          Modifier
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Supprimer ce niveau ?')) {
                              remove.mutate(l.id)
                            }
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-2">
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
