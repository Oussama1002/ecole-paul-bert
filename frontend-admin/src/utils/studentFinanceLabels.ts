export const FEE_FREQUENCY_LABELS: Record<string, string> = {
  once: 'Paiement unique',
  monthly: 'Mensuel',
  term: 'Par trimestre',
  yearly: 'Annuel',
}

export const FEE_ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'À payer',
  partial: 'Partiel',
  paid: 'Soldé',
  overdue: 'En retard',
  cancelled: 'Annulé',
  waived: 'Exonéré',
}

export const FEE_ASSIGNMENT_STATUS_PILL: Record<string, string> = {
  pending: 'school-pill-sun',
  partial: 'school-pill-sky',
  paid: 'school-pill-green',
  overdue: 'school-pill-coral',
  cancelled: 'school-pill-muted',
  waived: 'school-pill-muted',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces',
  cheque: 'Chèque',
  check: 'Chèque',
  virement: 'Virement bancaire',
  transfer: 'Virement bancaire',
  carte: 'Carte bancaire',
  card: 'Carte bancaire',
  mobile: 'Paiement mobile',
}

export function formatMad(amount: string | number): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  if (Number.isNaN(n)) return '—'
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`
}
