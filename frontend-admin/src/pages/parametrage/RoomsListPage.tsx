import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as roomsApi from '../../api/rooms'
import { useAuth } from '../../contexts/AuthContext'
import { RoomFormModal } from './RoomFormModal'

const typeLabels: Record<string, string> = {
  classroom: 'Classe',
  lab: 'Laboratoire',
  hall: 'Salle polyvalente',
  office: 'Bureau',
  library: 'Bibliothèque',
  sports: 'Sport',
  other: 'Autre',
}

const statusLabels: Record<string, string> = {
  available: 'Disponible',
  unavailable: 'Indisponible',
  maintenance: 'En maintenance',
}

export function RoomsListPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [roomType, setRoomType] = useState('')
  const [status, setStatus] = useState('')
  const [modalRoom, setModalRoom] = useState<number | 'new' | null>(null)
  const canManage = hasPermission('rooms.manage')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['rooms', page, roomType, status],
    queryFn: () =>
      roomsApi.fetchRooms({
        page,
        per_page: 25,
        room_type: roomType || undefined,
        status: status || undefined,
        sort_by: 'name',
        sort_order: 'asc',
      }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => roomsApi.deleteRoom(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-slate-800">Salles</h2>
        {canManage && (
          <button
            type="button"
            onClick={() => setModalRoom('new')}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Nouvelle salle
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label>
          <span className="mb-1 block text-xs text-slate-500">Type</span>
          <select
            value={roomType}
            onChange={(e) => {
              setRoomType(e.target.value)
              setPage(1)
            }}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            {Object.entries(typeLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
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
            <option value="available">Disponible</option>
            <option value="unavailable">Indisponible</option>
            <option value="maintenance">En maintenance</option>
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
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Capacité</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-mono">{r.code}</td>
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2">
                    {typeLabels[r.room_type] ?? r.room_type}
                  </td>
                  <td className="px-4 py-2">{r.capacity ?? '—'}</td>
                  <td className="px-4 py-2">
                    {statusLabels[r.status] ?? r.status}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => setModalRoom(r.id)}
                          className="mr-3 text-xs text-indigo-600 hover:underline"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Supprimer cette salle ?')) {
                              remove.mutate(r.id)
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

      {modalRoom !== null && (
        <RoomFormModal
          roomId={modalRoom === 'new' ? null : modalRoom}
          onClose={() => setModalRoom(null)}
        />
      )}
    </div>
  )
}
