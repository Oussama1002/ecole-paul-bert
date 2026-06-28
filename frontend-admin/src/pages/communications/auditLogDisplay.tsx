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

// ─── Friendly French diff renderer ────────────────────────────────────────

const FIELD_FR: Record<string, string> = {
  // common
  name: 'Nom',
  email: 'E-mail',
  phone: 'Téléphone',
  address: 'Adresse',
  city: 'Ville',
  status: 'Statut',
  amount: 'Montant',
  notes: 'Notes',
  description: 'Description',
  // school settings
  'school.name': "Nom de l'école",
  'school.address': 'Adresse',
  'school.city': 'Ville',
  'school.phone': 'Téléphone',
  'school.email': 'E-mail',
  'school.logo_path': 'Logo',
  'bulletin.title': 'Titre du bulletin',
  'bulletin.signature_line': 'Ligne de signature',
  'bulletin.footer_line': 'Pied de page',
  'bulletin.show_attendance': 'Afficher absences',
  'bulletin.show_ranking': 'Afficher rang',
  'bulletin.principal_comment': 'Commentaire direction',
  'bulletin.teacher_comment': 'Commentaire enseignant',
  'attendance_alerts.window_days': 'Fenêtre alertes (jours)',
  'attendance_alerts.unjustified_absences': 'Seuil absences non justifiées',
  'attendance_alerts.late_count': 'Seuil retards',
  current_school_year_id: 'Année scolaire active',
  'finance_journal.income_labels': 'Catégories recettes',
  'finance_journal.expense_labels': 'Catégories dépenses',
  // user
  first_name: 'Prénom',
  last_name: 'Nom',
  username: 'Identifiant',
  role_id: 'Rôle',
  // invoice/payment
  invoice_number: 'N° facture',
  payment_reference: 'Référence',
  payment_method: 'Méthode',
  payment_date: 'Date du paiement',
  issue_date: "Date d'émission",
  due_date: 'Échéance',
  total_amount: 'Total',
  amount_paid: 'Payé',
  amount_due: 'Reste',
  discount_amount: 'Remise',
  tax_amount: 'Taxe',
  cancel_reason: "Motif d'annulation",
  cancelled_at: 'Annulé le',
  // student
  student_code: 'Matricule',
  date_of_birth: 'Date de naissance',
  // teacher
  employee_code: 'Matricule',
  employment_type: 'Type de contrat',
}

const STATUS_VALUES_FR: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  pending: 'En attente',
  archived: 'Archivé',
  withdrawn: 'Retiré',
  graduated: 'Diplômé',
  transferred: 'Transféré',
  suspended: 'Suspendu',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
  draft: 'Brouillon',
  issued: 'Émise',
  partial: 'Partielle',
  paid: 'Payée',
  published: 'Publié',
  cash: 'Espèces',
  card: 'Carte',
  transfer: 'Virement',
  check: 'Chèque',
}

function prettifyKey(path: string): string {
  if (FIELD_FR[path]) return FIELD_FR[path]
  const last = path.split('.').pop() ?? path
  if (FIELD_FR[last]) return FIELD_FR[last]
  return last
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(path: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (Array.isArray(value)) {
    if (value.length === 0) return '— (vide)'
    return value.map((v) => String(v)).join(', ')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  const str = String(value)
  // status-like / known enums
  if (
    path.endsWith('status') ||
    path.endsWith('payment_method') ||
    STATUS_VALUES_FR[str]
  ) {
    return STATUS_VALUES_FR[str] ?? str
  }
  // long logo paths or storage paths — shorten
  if ((path.includes('logo') || path.includes('path')) && str.length > 40) {
    return '… ' + str.slice(-32)
  }
  return str
}

export type AuditChange = { path: string; label: string; before: string; after: string }

function flatten(obj: Record<string, unknown> | null | undefined, prefix = ''): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {}
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(out, flatten(val as Record<string, unknown>, path))
    } else {
      out[path] = val
    }
  }
  return out
}

export function computeAuditDiff(
  oldVals: Record<string, unknown> | null,
  newVals: Record<string, unknown> | null
): AuditChange[] {
  const oldFlat = flatten(oldVals)
  const newFlat = flatten(newVals)
  const keys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)])
  const changes: AuditChange[] = []
  for (const path of keys) {
    const before = oldFlat[path]
    const after = newFlat[path]
    const bStr = JSON.stringify(before ?? null)
    const aStr = JSON.stringify(after ?? null)
    if (bStr === aStr) continue
    changes.push({
      path,
      label: prettifyKey(path),
      before: formatValue(path, before),
      after: formatValue(path, after),
    })
  }
  return changes.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}
