/** Shared palette + formatters for the analytics pages. */

export const PALETTE = {
  blue: '#2563EB',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
  gray: '#6B7280',
  grape: '#8E5CFF',
} as const

export function formatMoney(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} MAD`
}

/** Compact money for dense axes (e.g. 1,2 M / 950 k). */
export function formatMoneyShort(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`
  if (abs >= 1_000) return `${Math.round(n / 1_000).toLocaleString('fr-FR')} k`
  return Math.round(n).toLocaleString('fr-FR')
}

export function formatPercent(n: number): string {
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

export function formatGrade(n: number): string {
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/20`
}

export function formatNumber(n: number): string {
  return n.toLocaleString('fr-FR')
}

/** Signed percentage change from `prev` to `curr`. 0 when prev is 0. */
export function pctChange(curr: number, prev: number): number {
  if (!prev) return 0
  return ((curr - prev) / Math.abs(prev)) * 100
}
