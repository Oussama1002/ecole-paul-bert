export const TEACHER_DOC_TYPE_LABELS: Record<string, string> = {
  cin: 'CIN',
  cv: 'CV',
  contract: 'Contrat',
  certificate: 'Diplôme / certificat',
  addendum: 'Avenant',
  id_proof: "Pièce d'identité",
  other: 'Autre',
}

/** Document slots shown on the new-teacher form */
export const TEACHER_DOC_UPLOAD_SLOTS = [
  { type: 'cin', label: 'CIN' },
  { type: 'cv', label: 'CV' },
  { type: 'certificate', label: 'Diplôme / certificat' },
  { type: 'contract', label: 'Contrat' },
] as const

export type PendingTeacherDocuments = Partial<Record<string, File>>
