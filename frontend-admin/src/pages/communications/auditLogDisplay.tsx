import type { AuditLogRow } from '../../api/auditLogs'

export const MODULE_FR: Record<string, string> = {
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

export const VERB_FR: Record<string, string> = {
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

export const VERB_STYLE: Record<string, string> = {
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

export const SUBJECT_FR: Record<string, string> = {
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

export function parseAction(code: string): { module: string; verb: string } {
  const dot = code.indexOf('.')
  if (dot === -1) return { module: prettify(code), verb: '' }
  const moduleKey = code.slice(0, dot)
  const verbKey = code.slice(dot + 1)
  return {
    module: MODULE_FR[moduleKey] ?? prettify(moduleKey),
    verb: VERB_FR[verbKey] ?? prettify(verbKey),
  }
}

export function ActionBadge({ code }: { code: string }) {
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

export function formatAuditDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR')
}

export function formatSubjectTarget(row: AuditLogRow): string {
  if (row.subject_type) {
    const name = row.subject_type.split('\\').pop() ?? ''
    const label = SUBJECT_FR[name] ?? name
    return row.subject_id != null ? `${label} #${row.subject_id}` : label
  }
  if (typeof row.new_values?.path === 'string') {
    return row.new_values.path
  }
  return '—'
}

const PROFILE_FIELD_FR: Record<string, string> = {
  first_name: 'Prénom',
  last_name: 'Nom',
  email: 'E-mail',
  phone: 'Téléphone',
  username: 'Identifiant',
}

export function formatProfileChanges(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null
): { label: string; before: string; after: string }[] {
  if (!newValues) return []
  return Object.keys(PROFILE_FIELD_FR)
    .filter((key) => oldValues?.[key] !== newValues[key])
    .map((key) => ({
      label: PROFILE_FIELD_FR[key],
      before: oldValues?.[key] != null && oldValues[key] !== '' ? String(oldValues[key]) : '—',
      after: newValues[key] != null && newValues[key] !== '' ? String(newValues[key]) : '—',
    }))
}

export function shouldHideAuditOldValues(action: string): boolean {
  return action === 'auth.profile_updated' || action === 'auth.password_changed'
}

export function shouldHideAuditRawValues(action: string): boolean {
  return action === 'auth.profile_updated' || action === 'auth.password_changed'
}
