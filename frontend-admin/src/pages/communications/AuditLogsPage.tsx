import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import * as auditLogsApi from '../../api/auditLogs'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'

export function AuditLogsPage() {
  const [action, setAction] = useState('')

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
      <h2 className="text-xl font-semibold text-slate-800">Journal d’audit</h2>
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
            </tr>
          </thead>
          <tbody>
            {data?.items.map((row) => (
              <tr key={row.id} className="border-b border-slate-100">
                <td className="px-3 py-2 text-slate-600">
                  {row.created_at
                    ? new Date(row.created_at).toLocaleString('fr-FR')
                    : '—'}
                </td>
                <td className="px-3 py-2">
                  {row.user
                    ? `${row.user.first_name} ${row.user.last_name}`
                    : '—'}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.action}</td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {row.subject_type ? row.subject_type.split('\\').pop() : '—'}
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
    </div>
  )
}
