import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import * as api from '../../api/notificationSettings'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  in_app: 'In-App',
}

const TYPE_LABELS: Record<string, string> = {
  AbsenceAlert: 'Absence',
  LateAlert: 'Retard',
  PaymentReminder: 'Rappel paiement',
  PaymentReceived: 'Paiement reçu',
  AnnouncementBroadcast: 'Annonce',
  ReportCardAvailable: 'Bulletin',
  TestNotification: 'Test',
}

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
}

const STATUS_LABELS: Record<string, string> = {
  sent: 'Envoyé',
  failed: 'Échec',
  pending: 'En attente',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationLogsPage() {
  const [page, setPage] = useState(1)
  const [channel, setChannel] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['notification-logs', page, channel, status, from, to],
    queryFn: () =>
      api.fetchNotificationLogs({
        page,
        per_page: 30,
        channel: channel || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  })

  const resetToFirstPage = () => setPage(1)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">
          Journal des notifications
        </h2>
        <p className="text-sm text-slate-500">
          Historique des envois e-mail / SMS / notifications internes.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Canal
          </span>
          <select
            className="rounded border border-slate-300 px-3 py-1.5"
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value)
              resetToFirstPage()
            }}
          >
            <option value="">Tous</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="in_app">In-App</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Statut
          </span>
          <select
            className="rounded border border-slate-300 px-3 py-1.5"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              resetToFirstPage()
            }}
          >
            <option value="">Tous</option>
            <option value="sent">Envoyé</option>
            <option value="failed">Échec</option>
            <option value="pending">En attente</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Du
          </span>
          <input
            type="date"
            className="rounded border border-slate-300 px-3 py-1.5"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              resetToFirstPage()
            }}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Au
          </span>
          <input
            type="date"
            className="rounded border border-slate-300 px-3 py-1.5"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              resetToFirstPage()
            }}
          />
        </label>
        {(channel || status || from || to) && (
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
            onClick={() => {
              setChannel('')
              setStatus('')
              setFrom('')
              setTo('')
              resetToFirstPage()
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {isLoading && <LoadingState label="Chargement du journal…" lines={4} />}
      {error && (
        <ErrorState error={error} fallback="Impossible de charger le journal." />
      )}

      {data && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white text-sm shadow-sm">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Destinataire</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Canal</th>
                <th className="px-3 py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium text-slate-700">
                      {row.recipient ?? `#${row.notifiable_id}`}
                    </span>
                    <span className="ml-1 text-xs text-slate-400">
                      ({row.notifiable_type})
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {TYPE_LABELS[row.notification_type] ?? row.notification_type}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {CHANNEL_LABELS[row.channel] ?? row.channel}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[row.status] ?? 'bg-slate-100 text-slate-600'
                      }`}
                      title={row.error_message ?? undefined}
                    >
                      {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                    {row.status === 'failed' && row.error_message && (
                      <span className="ml-2 text-xs text-red-500" title={row.error_message}>
                        ⚠
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.items.length && (
            <EmptyState
              emoji="📨"
              title="Aucune notification"
              hint="Les envois e-mail / SMS apparaîtront ici."
            />
          )}
          {data.meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
              <span className="text-slate-600">
                Page {data.meta.current_page} / {data.meta.last_page} ({data.meta.total})
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
    </div>
  )
}
