import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import * as reportCardsApi from '../../api/reportCards'
import * as studentsApi from '../../api/students'
import * as subjectsApi from '../../api/subjects'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { StudentAvatar } from '../../components/ui/StudentAvatar'

const STATUS_PILL: Record<string, string> = {
  draft: 'school-pill-sun',
  published: 'school-pill-green',
  archived: 'school-pill-muted',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
}

export function ReportCardDetailPage() {
  const { id } = useParams()
  const numericId = id ? parseInt(id, 10) : NaN
  const qc = useQueryClient()
  const { simpleMode } = useSimpleMode()
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['report-card', numericId],
    queryFn: async () => {
      type Ok<T> = { success: true; message: string; data: T }
      type Err = { success: false; message: string; errors: Record<string, string[]> }
      const { data } = await apiClient.get<Ok<reportCardsApi.ReportCard> | Err>(
        `/v1/report-cards/${numericId}`
      )
      if (!data.success) throw new Error(data.message)
      return data.data
    },
    enabled: !Number.isNaN(numericId),
  })

  const { data: student } = useQuery({
    queryKey: ['student', data?.student_id],
    queryFn: () => studentsApi.fetchStudent(data!.student_id),
    enabled: !!data?.student_id,
  })

  const { data: subjectsList } = useQuery({
    queryKey: ['subjects-for-report-card', numericId],
    queryFn: () =>
      subjectsApi.fetchSubjects({
        per_page: 500,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    enabled: !simpleMode && !!data,
  })
  const subjectsById = new Map<number, subjectsApi.Subject>(
    (subjectsList?.items ?? []).map((s) => [s.id, s])
  )

  const publish = useMutation({
    mutationFn: () => reportCardsApi.publishReportCard(numericId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-cards'] })
      qc.invalidateQueries({ queryKey: ['report-card', numericId] })
    },
  })

  const archive = useMutation({
    mutationFn: () => reportCardsApi.archiveReportCard(numericId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-cards'] })
      qc.invalidateQueries({ queryKey: ['report-card', numericId] })
    },
  })

  if (Number.isNaN(numericId)) {
    return (
      <p className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
        Identifiant invalide.
      </p>
    )
  }
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-3xl border-2 border-school-line bg-white/70" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-3xl border-2 border-school-line bg-white/70"
            />
          ))}
        </div>
      </div>
    )
  }
  if (isError) {
    return (
      <p className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
        {(error as Error).message}
      </p>
    )
  }
  if (!data) {
    return (
      <EmptyState
        emoji="🔍"
        title="Bulletin introuvable"
        hint="Ce bulletin n'existe plus ou vous n'avez pas le droit de le voir."
      />
    )
  }

  const avg = data.period_average ? parseFloat(data.period_average) : null
  const avgPct =
    avg != null ? Math.max(0, Math.min(100, Math.round((avg / 20) * 100))) : 0
  const avgTone =
    avg == null
      ? 'bg-school-line'
      : avg >= 14
        ? 'bg-gradient-to-r from-school-mint to-school-leafdeep'
        : avg >= 10
          ? 'bg-gradient-to-r from-school-sun to-school-mango'
          : 'bg-gradient-to-r from-school-coral to-school-cherry'

  const subjectAverages = Object.entries(data.subject_averages ?? {})

  return (
    <div className="space-y-5">
      <Link
        to="/bulletins"
        className="inline-flex items-center gap-1 text-sm font-bold text-school-grape hover:underline"
      >
        ← Retour aux bulletins
      </Link>

      <section className="school-hero">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-white/15 p-1 backdrop-blur ring-2 ring-white/30">
              <StudentAvatar
                firstName={student?.first_name}
                lastName={student?.last_name}
                seed={data.student_id}
                size="lg"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">
                Bulletin scolaire
              </p>
              <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                {student
                  ? `${student.first_name} ${student.last_name}`
                  : data.student_name ?? 'Non défini'}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="school-chip-on-dark">
                  <span aria-hidden>🪪</span>
                  {student?.student_code ?? data.student_code ?? 'Non défini'}
                </span>
                <span className="school-chip-on-dark">
                  <span aria-hidden>🚪</span>
                  {data.class_name ?? 'Non défini'}
                </span>
                <span className="school-chip-on-dark">
                  <span aria-hidden>🗓️</span>
                  {data.school_year_name ?? 'Non défini'}
                </span>
                <span className="school-chip-on-dark">
                  <span aria-hidden>📘</span>
                  {data.evaluation_period_name ?? 'Non défini'}
                </span>
                {!simpleMode && (
                  <span className={`${STATUS_PILL[data.status] ?? 'school-pill-muted'} !bg-white/90`}>
                    {STATUS_LABEL[data.status] ?? data.status}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pdfLoading}
              onClick={async () => {
                setPdfError(null)
                setPdfLoading(true)
                try {
                  const res = await apiClient.get<Blob>(
                    `/v1/report-cards/${data.id}/pdf`,
                    { responseType: 'blob' }
                  )
                  if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
                  setPdfPreviewUrl(URL.createObjectURL(res.data))
                } catch {
                  setPdfError('Aperçu impossible. Essayez de télécharger directement.')
                } finally {
                  setPdfLoading(false)
                }
              }}
              className="rounded-2xl border-2 border-white/60 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
            >
              {pdfLoading ? '⏳ Chargement…' : '👁️ Aperçu PDF'}
            </button>
            <button
              type="button"
              onClick={() => reportCardsApi.downloadReportCardPdf(data.id)}
              className="rounded-2xl border-2 border-white/60 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              ⬇ Télécharger PDF
            </button>
            {!simpleMode && (
              <>
                <button
                  type="button"
                  onClick={() => publish.mutate()}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-school-grape shadow transition hover:bg-school-cream disabled:opacity-60"
                  disabled={publish.isPending}
                >
                  {publish.isPending ? 'Publication…' : 'Publier'}
                </button>
                <button
                  type="button"
                  onClick={() => archive.mutate()}
                  className="rounded-2xl border-2 border-white/60 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
                  disabled={archive.isPending}
                >
                  Archiver
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="school-tile school-accent-purple">
          <p className="text-[11px] font-bold uppercase tracking-wider text-school-inkmuted">
            Moyenne générale
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-display text-3xl font-bold text-school-ink tabular-nums">
              {data.period_average ?? '—'}
            </span>
            {data.period_average ? (
              <span className="text-sm font-semibold text-school-inkmuted">/20</span>
            ) : null}
          </div>
          <div className="school-stat-bar mt-3">
            <div
              className={`school-stat-bar-fill ${avgTone}`}
              style={{ width: `${avgPct}%` }}
            />
          </div>
        </div>
        <div className="school-tile school-accent-blue">
          <p className="text-[11px] font-bold uppercase tracking-wider text-school-inkmuted">
            Rang
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-school-ink tabular-nums">
            {data.rank ? `${data.rank}` : '—'}
            {data.rank ? (
              <span className="text-base font-semibold text-school-inkmuted">
                {' '}/ {data.rank_out_of ?? '—'}
              </span>
            ) : null}
          </p>
        </div>
        <div className="school-tile school-accent-coral">
          <p className="text-[11px] font-bold uppercase tracking-wider text-school-inkmuted">
            Absences
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-school-ink tabular-nums">
            {data.absent_count}
          </p>
        </div>
        <div className="school-tile school-accent-yellow">
          <p className="text-[11px] font-bold uppercase tracking-wider text-school-inkmuted">
            Retards
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-school-ink tabular-nums">
            {data.late_count}
          </p>
        </div>
      </section>

      {pdfError && (
        <p className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
          {pdfError}
        </p>
      )}

      {pdfPreviewUrl && (
        <section className="school-section space-y-3">
          <div className="flex items-center justify-between">
            <SectionTitle emoji="📄" title="Aperçu du bulletin PDF" iconClassName="bg-school-grape/10 text-school-grape" />
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(pdfPreviewUrl)
                setPdfPreviewUrl(null)
              }}
              className="school-btn-secondary text-xs"
            >
              Fermer l'aperçu
            </button>
          </div>
          <iframe
            src={pdfPreviewUrl}
            className="h-[80vh] w-full rounded-2xl border-2 border-school-line"
            title="Aperçu bulletin PDF"
          />
        </section>
      )}

      {!simpleMode && (
        <section className="school-section">
          <SectionTitle
            emoji="📚"
            title="Moyennes par matière"
            iconClassName="bg-school-grape/10 text-school-grape"
          />
          {subjectAverages.length === 0 ? (
            <EmptyState
              emoji="📐"
              title="Aucune note"
              hint="Les moyennes par matière apparaîtront ici une fois saisies."
            />
          ) : (
            <ul className="space-y-2">
              {subjectAverages.map(([sid, value]) => {
                const v = typeof value === 'number' ? value : parseFloat(String(value))
                const pct = Number.isFinite(v)
                  ? Math.max(0, Math.min(100, Math.round((v / 20) * 100)))
                  : 0
                const tone =
                  !Number.isFinite(v) || v < 10
                    ? 'bg-gradient-to-r from-school-coral to-school-cherry'
                    : v < 14
                      ? 'bg-gradient-to-r from-school-sun to-school-mango'
                      : 'bg-gradient-to-r from-school-mint to-school-leafdeep'
                const subjectIdNum = Number(sid)
                const subject = Number.isFinite(subjectIdNum)
                  ? subjectsById.get(subjectIdNum)
                  : null
                const subjectLabel = subject?.name ?? 'Matière non renseignée'
                return (
                  <li
                    key={sid}
                    className="rounded-2xl border-2 border-school-line bg-white px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold text-school-ink">
                        {subjectLabel}
                      </span>
                      <span className="font-display text-base font-bold tabular-nums text-school-grape">
                        {value}
                        <span className="ml-1 text-[11px] font-semibold text-school-inkmuted">
                          /20
                        </span>
                      </span>
                    </div>
                    <div className="school-stat-bar mt-2">
                      <div
                        className={`school-stat-bar-fill ${tone}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
