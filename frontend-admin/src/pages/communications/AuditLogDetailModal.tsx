import { useState } from 'react'
import type { AuditLogRow } from '../../api/auditLogs'
import {
  ActionBadge,
  computeAuditDiff,
  formatAuditDateTimeDetail,
  formatProfileChanges,
  formatSubjectTarget,
  shouldHideAuditOldValues,
  shouldHideAuditRawValues,
} from './auditLogDisplay'

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
  const [showRaw, setShowRaw] = useState(false)
  const oldJson = formatJsonBlock(row.old_values)
  const newJson = formatJsonBlock(row.new_values)
  const hideOldValues = shouldHideAuditOldValues(row.action)
  const hideRawValues = shouldHideAuditRawValues(row.action)
  const profileChanges =
    row.action === 'auth.profile_updated'
      ? formatProfileChanges(row.old_values, row.new_values)
      : []
  const diff = !hideRawValues
    ? computeAuditDiff(row.old_values, row.new_values)
    : []

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
                Date et heure
              </dt>
              <dd className="mt-1 text-school-ink">
                {formatAuditDateTimeDetail(row.created_at)}
              </dd>
              {row.created_at && (
                <dd className="mt-0.5 font-mono text-[11px] text-school-inkmuted">
                  {row.created_at}
                </dd>
              )}
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
              <dd className="mt-1">
                <ActionBadge code={row.action} />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Cible
              </dt>
              <dd className="mt-1 text-school-ink">{formatSubjectTarget(row)}</dd>
            </div>
          </dl>

          {profileChanges.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Modifications
              </p>
              <ul className="space-y-2 rounded-xl border border-school-line bg-school-canvas px-4 py-3">
                {profileChanges.map((change) => (
                  <li key={change.label} className="text-school-ink">
                    <span className="font-semibold">{change.label}</span>
                    {' : '}
                    <span className="text-school-inkmuted">{change.before}</span>
                    {' → '}
                    <span>{change.after}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hideRawValues && diff.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                  Modifications ({diff.length})
                </p>
                {(oldJson || newJson) && (
                  <button
                    type="button"
                    onClick={() => setShowRaw((v) => !v)}
                    className="text-xs font-semibold text-school-grape hover:underline"
                  >
                    {showRaw ? 'Masquer le JSON brut' : 'Voir le JSON brut'}
                  </button>
                )}
              </div>
              <div className="overflow-hidden rounded-xl border border-school-line bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-school-canvas text-school-inkmuted">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Champ</th>
                      <th className="px-3 py-2 text-left font-semibold">Avant</th>
                      <th className="px-3 py-2 text-left font-semibold">Après</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.map((c) => (
                      <tr key={c.path} className="border-t border-school-line">
                        <td className="px-3 py-2 font-semibold text-school-ink">{c.label}</td>
                        <td className="px-3 py-2 text-school-inkmuted line-through">{c.before}</td>
                        <td className="px-3 py-2 text-school-ink">{c.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showRaw && oldJson && !hideOldValues && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Anciennes valeurs (JSON)
              </p>
              <pre className="max-h-48 overflow-auto rounded-xl border border-school-line bg-school-canvas p-3 font-mono text-xs text-school-ink">
                {oldJson}
              </pre>
            </div>
          )}

          {showRaw && newJson && !hideRawValues && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Nouvelles valeurs (JSON)
              </p>
              <pre className="max-h-48 overflow-auto rounded-xl border border-school-line bg-school-canvas p-3 font-mono text-xs text-school-ink">
                {newJson}
              </pre>
            </div>
          )}

          {!hideRawValues && diff.length === 0 && !oldJson && !newJson && (
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
