import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import * as auditLogsApi from '../../api/auditLogs'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'

const MODULE_FR: Record<string, string> = {
  announcement: 'Annonce',
  auth: 'Authentification',
  access: 'Consultation',
  create: 'Création (API)',
  update: 'Modification (API)',
  destroy: 'Suppression (API)',
  request: 'Requête API',
  document: 'Document',
  evaluation_period: "Période d'évaluation",
  grades: 'Notes',
  invoice: 'Facture',
  payment: 'Paiement',
  settings: 'Réglages',
  student: 'Élève',
  teacher: 'Enseignant',
  user: 'Utilisateur',
}

const VERB_FR: Record<string, string> = {
  created: 'Création',
  updated: 'Modification',
  deleted: 'Suppression',
  archived: 'Archivage',
  downloaded: 'Téléchargement',
  published: 'Publication',
  cancelled: 'Annulation',
  issued: 'Émission',
  recorded: 'Enregistrement',
  role_changed: 'Changement de rôle',
  locked_period_changed: 'Verrouillage de période',
  login: 'Connexion',
  logout: 'Déconnexion',
  login_failed: 'Échec connexion',
  login_denied: 'Connexion refusée',
  profile_updated: 'Profil mis à jour',
  password_changed: 'Mot de passe changé',
}

// Badge colour by verb category
const VERB_STYLE: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  recorded: 'bg-green-100 text-green-700',
  issued: 'bg-green-100 text-green-700',
  published: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  role_changed: 'bg-blue-100 text-blue-700',
  locked_period_changed: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
  archived: 'bg-amber-100 text-amber-700',
  downloaded: 'bg-slate-100 text-slate-600',
}

const SUBJECT_FR: Record<string, string> = {
  Invoice: 'Facture',
  Payment: 'Paiement',
  User: 'Utilisateur',
  Student: 'Élève',
  Teacher: 'Enseignant',
  Document: 'Document',
  Announcement: 'Annonce',
  Expense: 'Dépense',
  EvaluationPeriod: "Période d'évaluation",
  SchoolClass: 'Classe',
  Level: 'Niveau',
}

const prettify = (raw: string) =>
  raw.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function parseAction(code: string): { module: string; verb: string } {
  const dot = code.indexOf('.')
  if (dot === -1) return { module: prettify(code), verb: '' }
  const moduleKey = code.slice(0, dot)
  const verbKey = code.slice(dot + 1)
  return {
    module: MODULE_FR[moduleKey] ?? prettify(moduleKey),
    verb: VERB_FR[verbKey] ?? prettify(verbKey),
  }
}

function ActionBadge({ code }: { code: string }) {
  const { module, verb } = parseAction(code)
  const verbKey = code.slice(code.indexOf('.') + 1)
  const style = VERB_STYLE[verbKey] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
        {verb || module}
      </span>
      {verb ? <span className="text-sm text-slate-700">{module}</span> : null}
    </span>
  )
}

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
                <td className="px-3 py-2">
                  <ActionBadge code={row.action} />
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {row.subject_type
                    ? (() => {
                        const name = row.subject_type.split('\\').pop() ?? ''
                        const label = SUBJECT_FR[name] ?? name
                        return row.subject_id != null
                          ? `${label} #${row.subject_id}`
                          : label
                      })()
                    : typeof row.new_values?.path === 'string'
                      ? row.new_values.path
                      : '—'}
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
