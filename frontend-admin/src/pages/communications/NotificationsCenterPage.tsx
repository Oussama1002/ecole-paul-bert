import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as notificationsApi from '../../api/notifications'
import { useSimpleMode } from '../../contexts/SimpleModeContext'

export function NotificationsCenterPage() {
  const { simpleMode } = useSimpleMode()
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['internal-notifications'],
    queryFn: () =>
      notificationsApi.fetchNotifications({ per_page: 50, unread_only: false }),
  })

  const readMut = useMutation({
    mutationFn: notificationsApi.markNotificationRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['internal-notifications'] })
      void qc.invalidateQueries({ queryKey: ['notification-indicators'] })
    },
  })

  const readAllMut = useMutation({
    mutationFn: notificationsApi.markAllNotificationsRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['internal-notifications'] })
      void qc.invalidateQueries({ queryKey: ['notification-indicators'] })
    },
  })

  if (isLoading) {
    return <p className="text-sm text-slate-500">Chargement…</p>
  }
  if (error) {
    return (
      <p className="text-sm text-red-600">
        {(error as Error).message || 'Erreur'}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Notifications</h2>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => void readAllMut.mutateAsync()}
          disabled={readAllMut.isPending}
        >
          Tout marquer comme lu
        </button>
      </div>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
        {data?.items.map((n) => (
          <li
            key={n.id}
            className={`flex flex-col gap-1 px-4 py-3 ${
              n.read_at ? 'bg-white' : 'bg-indigo-50/40'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="font-medium text-slate-800">{n.title}</span>
              <span className="text-xs text-slate-500">
                {n.created_at
                  ? new Date(n.created_at).toLocaleString('fr-FR')
                  : ''}
              </span>
            </div>
            {n.body ? (
              <p className="text-sm text-slate-600">{n.body}</p>
            ) : null}
            <div className="flex items-center gap-3">
              {!simpleMode && (
                <span className="text-xs uppercase text-slate-400">{n.type}</span>
              )}
              {!n.read_at ? (
                <button
                  type="button"
                  className="text-xs text-indigo-600 hover:underline"
                  onClick={() => void readMut.mutateAsync(n.id)}
                >
                  Marquer comme lu
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {!data?.items.length ? (
        <p className="text-center text-sm text-slate-500">Aucune notification.</p>
      ) : null}
    </div>
  )
}
