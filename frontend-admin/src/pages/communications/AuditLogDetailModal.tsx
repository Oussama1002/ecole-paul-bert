import type { AuditLogRow } from '../../api/auditLogs'
import { ActionBadge, formatSubjectTarget, formatAuditDate } from './auditLogDisplay'

function formatJsonBlock(values: Record<string, unknown> | null): string | null {
  if (!values || Object.keys(values).length === 0) return null
  return JSON.stringify(values, null, 2)
}

export function AuditLogDetailModal({
  row,
  onClose,
}: {
  row: AuditLogRow
  onClose: () => void
}) {
  const oldJson = formatJsonBlock(row.old_values)
  const newJson = formatJsonBlock(row.new_values)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-school-border/70 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-school-line bg-white px-6 py-4">
          <h3 className="font-display text-lg font-bold text-school-ink">
            Détail de l'action
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-school-inkmuted hover:text-school-ink"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-6 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Date
              </dt>
              <dd className="mt-1 text-school-ink">{formatAuditDate(row.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Adresse IP
              </dt>
              <dd className="mt-1 font-mono text-school-ink">{row.ip_address ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Utilisateur
              </dt>
              <dd className="mt-1 text-school-ink">
                {row.user
                  ? `${row.user.first_name} ${row.user.last_name} (${row.user.email})`
                  : '—'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Action
              </dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <ActionBadge code={row.action} />
                <span className="font-mono text-xs text-school-inkmuted">{row.action}</span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Cible
              </dt>
              <dd className="mt-1 text-school-ink">{formatSubjectTarget(row)}</dd>
            </div>
          </dl>

          {oldJson && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Anciennes valeurs
              </p>
              <pre className="max-h-48 overflow-auto rounded-xl border border-school-line bg-school-canvas p-3 font-mono text-xs text-school-ink">
                {oldJson}
              </pre>
            </div>
          )}

          {newJson && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Nouvelles valeurs
              </p>
              <pre className="max-h-48 overflow-auto rounded-xl border border-school-line bg-school-canvas p-3 font-mono text-xs text-school-ink">
                {newJson}
              </pre>
            </div>
          )}

          {!oldJson && !newJson && (
            <p className="rounded-xl border border-school-line bg-school-canvas px-4 py-3 text-school-inkmuted">
              Aucune donnée de modification enregistrée pour cette action.
            </p>
          )}

          <div className="flex justify-end pt-2">
            <button type="button" onClick={onClose} className="school-btn-secondary">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
