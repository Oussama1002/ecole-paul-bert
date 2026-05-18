import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as levelsApi from '../../api/levels'
import * as subjectsApi from '../../api/subjects'
import { useAuth } from '../../contexts/AuthContext'
import { SubjectFormModal } from './SubjectFormModal'

export function SubjectsListPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [levelId, setLevelId] = useState<number | ''>('')
  const [modalSubject, setModalSubject] = useState<number | 'new' | null>(null)
  const canManage = hasPermission('subjects.manage')

  const { data: levels } = useQuery({
    queryKey: ['levels-all'],
    queryFn: () =>
      levelsApi.fetchLevels({ per_page: 200, sort_by: 'sort_order', sort_order: 'asc' }),
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['subjects', page, levelId],
    queryFn: () =>
      subjectsApi.fetchSubjects({
        page,
        per_page: 25,
        level_id: levelId === '' ? undefined : levelId,
        sort_by: 'name',
        sort_order: 'asc',
      }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => subjectsApi.deleteSubject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-slate-800">Matières</h2>
        {canManage && (
          <button
            type="button"
            onClick={() => setModalSubject('new')}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Nouvelle matière
          </button>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label>
          <span className="mb-1 block text-xs text-slate-500">Niveau</span>
          <select
            value={levelId === '' ? '' : levelId}
            onChange={(e) => {
              setLevelId(e.target.value === '' ? '' : Number(e.target.value))
              setPage(1)
            }}
            className="min-w-[200px] rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            {levels?.items.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Chargement…</p>}
      {isError && (
        <p className="text-sm text-red-600">{(error as Error).message}</p>
      )}

      {data && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-left">Niveau</th>
                <th className="px-4 py-2 text-left">Coef.</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 font-mono">{s.code}</td>
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {s.level?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2">{s.coefficient}</td>
                  <td className="px-4 py-2 text-right">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => setModalSubject(s.id)}
                          className="mr-3 text-xs text-indigo-600 hover:underline"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Supprimer cette matière ?')) {
                              remove.mutate(s.id)
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

      {modalSubject !== null && (
        <SubjectFormModal
          subjectId={modalSubject === 'new' ? null : modalSubject}
          onClose={() => setModalSubject(null)}
        />
      )}
    </div>
  )
}
