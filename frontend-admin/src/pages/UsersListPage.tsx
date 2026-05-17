import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as rolesApi from '../api/roles'
import * as usersApi from '../api/users'
import { useAuth } from '../contexts/AuthContext'
import { UserFormModal } from './UserFormModal'

const statusLabels: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  suspended: 'Suspendu',
}

export function UsersListPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [roleId, setRoleId] = useState<number | ''>('')
  const [status, setStatus] = useState<string>('')
  const [modalUser, setModalUser] = useState<number | 'new' | null>(null)

  const canDeactivate = hasPermission('users.deactivate')

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.fetchRoles,
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users', page, searchDebounced, roleId, status],
    queryFn: () =>
      usersApi.fetchUsers({
        page,
        per_page: 15,
        search: searchDebounced || undefined,
        role_id: roleId === '' ? undefined : roleId,
        status: status || undefined,
        sort_by: 'created_at',
        sort_order: 'desc',
      }),
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, next }: { id: number; next: string }) =>
      usersApi.updateUser(id, { status: next }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const removeUser = useMutation({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  function applySearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchDebounced(search.trim())
    setPage(1)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-slate-800">Utilisateurs</h2>
        {hasPermission('users.create') && (
          <button
            type="button"
            onClick={() => setModalUser('new')}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Nouvel utilisateur
          </button>
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
            placeholder="Nom, e-mail…"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-slate-500">Rôle</span>
          <select
            value={roleId === '' ? '' : roleId}
            onChange={(e) => {
              setRoleId(e.target.value === '' ? '' : Number(e.target.value))
              setPage(1)
            }}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            {roles?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
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
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
            <option value="suspended">Suspendu</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm hover:bg-slate-100"
        >
          Rechercher
        </button>
      </form>

      {isLoading && <p className="text-slate-600">Chargement…</p>}
      {isError && (
        <p className="text-red-600">
          {(error as Error).message || 'Erreur de chargement.'}
        </p>
      )}

      {data && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Nom</th>
                <th className="px-4 py-3 font-medium text-slate-700">E-mail</th>
                <th className="px-4 py-3 font-medium text-slate-700">Rôle</th>
                <th className="px-4 py-3 font-medium text-slate-700">Statut</th>
                <th className="px-4 py-3 font-medium text-slate-700">
                  Dernière connexion
                </th>
                <th className="px-4 py-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.role?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.status === 'active'
                          ? 'rounded bg-emerald-50 px-2 py-0.5 text-emerald-800'
                          : 'rounded bg-slate-100 px-2 py-0.5 text-slate-700'
                      }
                    >
                      {statusLabels[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.last_login_at
                      ? new Date(u.last_login_at).toLocaleString('fr-FR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {hasPermission('users.edit') && (
                        <button
                          type="button"
                          onClick={() => setModalUser(u.id)}
                          className="text-indigo-600 hover:underline"
                        >
                          Modifier
                        </button>
                      )}
                      {canDeactivate && u.status === 'active' && (
                        <button
                          type="button"
                          className="text-amber-700 hover:underline"
                          onClick={() =>
                            toggleStatus.mutate({ id: u.id, next: 'inactive' })
                          }
                          disabled={toggleStatus.isPending}
                        >
                          Désactiver
                        </button>
                      )}
                      {canDeactivate && u.status !== 'active' && (
                        <button
                          type="button"
                          className="text-emerald-700 hover:underline"
                          onClick={() =>
                            toggleStatus.mutate({ id: u.id, next: 'active' })
                          }
                          disabled={toggleStatus.isPending}
                        >
                          Activer
                        </button>
                      )}
                      {canDeactivate && (
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Supprimer définitivement ${u.first_name} ${u.last_name} ? Cette action est irréversible.`
                              )
                            ) {
                              removeUser.mutate(u.id)
                            }
                          }}
                          disabled={removeUser.isPending}
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
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
              <span className="text-slate-600">
                Page {data.meta.current_page} / {data.meta.last_page} (
                {data.meta.total} utilisateurs)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  disabled={page >= data.meta.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {modalUser !== null && (
        <UserFormModal
          userId={modalUser === 'new' ? null : modalUser}
          onClose={() => setModalUser(null)}
        />
      )}
    </div>
  )
}
