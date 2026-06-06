import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import * as auditLogsApi from '../../api/auditLogs'
import type { AuditLogRow } from '../../api/auditLogs'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { AuditLogDetailModal } from './AuditLogDetailModal'
import { ActionBadge, formatAuditDate, formatSubjectTarget } from './auditLogDisplay'

export function AuditLogsPage() {
  const [action, setAction] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', action],
    queryFn: () =>
      auditLogsApi.fetchAuditLogs({
        per_page: 40,
        action: action.trim() || undefined,
      }),
  })

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Journal d'audit</h2>
      <label className="flex max-w-md items-center gap-2 text-sm">
        <span className="text-slate-600">Filtrer action</span>
        <input
          className="flex-1 rounded border border-slate-300 px-3 py-1.5"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="ex. user.updated"
        />
      </label>
      {isLoading && <LoadingState label="Chargement du journal…" lines={4} />}
      {error && <ErrorState error={error} fallback="Impossible de charger le journal d'audit." />}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white text-sm shadow-sm">
        <table className="min-w-full text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Utilisateur</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Cible</th>
              <th className="px-3 py-2 text-right">Détail</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                onClick={() => setSelectedLog(row)}
              >
                <td className="px-3 py-2 text-slate-600">
                  {formatAuditDate(row.created_at)}
                </td>
                <td className="px-3 py-2">
                  {row.user
                    ? `${row.user.first_name} ${row.user.last_name}`
                    : '—'}
                </td>
                <td className="px-3 py-2">
                  <ActionBadge code={row.action} />
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {formatSubjectTarget(row)}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedLog(row)
                    }}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Voir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && !error && !data?.items.length && (
          <EmptyState
            emoji="📋"
            title="Aucune entrée dans le journal"
            hint="Les actions des utilisateurs apparaîtront ici."
          />
        )}
      </div>

      {selectedLog && (
        <AuditLogDetailModal row={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}
