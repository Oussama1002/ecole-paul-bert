import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import * as classesApi from '../../api/classes'
import * as evaluationPeriodsApi from '../../api/evaluationPeriods'
import * as reportCardsApi from '../../api/reportCards'
import * as schoolYearsApi from '../../api/schoolYears'
import * as studentsApi from '../../api/students'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { SearchSelect, type SearchSelectOption } from '../../components/ui/SearchSelect'
import { StudentAvatar } from '../../components/ui/StudentAvatar'
import { getApiErrorMessage } from '../../utils/apiError'

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

export function ReportCardsListPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const { simpleMode } = useSimpleMode()
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [classId, setClassId] = useState<number>(0)
  const [periodId, setPeriodId] = useState<number>(0)
  const [studentId, setStudentId] = useState<number | null>(null)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const { data: years } = useQuery({
    queryKey: ['school-years-report-cards'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 100,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
  })

  useEffect(() => {
    if (!years?.items.length || schoolYearId > 0) return
    const current = years.items.find((y) => y.is_current) ?? years.items[0]
    setSchoolYearId(current.id)
  }, [years, schoolYearId])

  const { data: classes } = useQuery({
    queryKey: ['classes-report-cards', schoolYearId],
    queryFn: () =>
      classesApi.fetchClasses({
        per_page: 100,
        school_year_id: schoolYearId,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
  })

  const { data: periods } = useQuery({
    queryKey: ['periods-report-cards', schoolYearId],
    queryFn: () =>
      evaluationPeriodsApi.fetchEvaluationPeriods({
        per_page: 100,
        school_year_id: schoolYearId,
        sort_by: 'sort_order',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
  })

  const { data, isLoading, isError, error: qerr, refetch } = useQuery({
    queryKey: ['report-cards', schoolYearId, classId, periodId, studentId, status],
    queryFn: () =>
      reportCardsApi.fetchReportCards({
        school_year_id: schoolYearId || undefined,
        class_id: classId || undefined,
        evaluation_period_id: periodId || undefined,
        student_id: studentId ?? undefined,
        status: (status as 'draft' | 'published' | 'archived') || undefined,
        per_page: 100,
      }),
    enabled: schoolYearId > 0,
  })

  // Student query is only used for the "Filtrer par élève" dropdown.
  const { data: studentsForClass } = useQuery({
    queryKey: ['students-by-class-rc', schoolYearId, classId],
    queryFn: () =>
      studentsApi.fetchStudents({
        per_page: 100,
        school_year_id: schoolYearId,
        class_id: classId,
        sort_by: 'last_name',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0 && classId > 0,
  })
  const studentOptions: SearchSelectOption[] = (studentsForClass?.items ?? []).map((s) => ({
    value: s.id,
    label: `${s.last_name} ${s.first_name}`,
    hint: s.student_code,
  }))

  const generate = useMutation({
    mutationFn: () =>
      reportCardsApi.generateReportCards({
        school_year_id: schoolYearId,
        class_id: classId,
        evaluation_period_id: periodId,
      }),
    onSuccess: () => {
      setError(null)
      qc.invalidateQueries({ queryKey: ['report-cards'] })
    },
    onError: (e) =>
      setError(getApiErrorMessage(e, 'La génération des bulletins a échoué.')),
  })

  const [publishingAll, setPublishingAll] = useState(false)
  const draftIds = (data?.items ?? [])
    .filter((rc) => rc.status === 'draft')
    .map((rc) => rc.id)

  async function publishAll() {
    if (!draftIds.length) return
    setPublishingAll(true)
    setError(null)
    try {
      for (const id of draftIds) {
        await reportCardsApi.publishReportCard(id)
      }
      qc.invalidateQueries({ queryKey: ['report-cards'] })
    } catch (e) {
      setError(getApiErrorMessage(e, 'Publication partielle — certains bulletins ont échoué.'))
    } finally {
      setPublishingAll(false)
    }
  }

  const publishOne = useMutation({
    mutationFn: (id: number) => reportCardsApi.publishReportCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report-cards'] }),
    onError: (e) => setError(getApiErrorMessage(e, 'Publication impossible.')),
  })

  const canGenerate = !generate.isPending

  return (
    <div className="space-y-4">
      <PageHeader
        emoji="📄"
        title="Bulletins"
        subtitle="Génération, publication et téléchargement des bulletins PDF."
        actions={
          <>
            {!simpleMode && hasPermission('report_cards.view') && (
              <Link to="/parametrage/bulletin-template" className="school-btn-secondary">
                🎨 Modèle
              </Link>
            )}
            {hasPermission('report_cards.manage') && draftIds.length > 0 && (
              <button
                type="button"
                onClick={publishAll}
                disabled={publishingAll}
                className="school-btn-secondary disabled:opacity-60"
              >
                {publishingAll ? 'Publication…' : `✅ Publier les ${draftIds.length} brouillon${draftIds.length > 1 ? 's' : ''}`}
              </button>
            )}
            {hasPermission('report_cards.manage') ? (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  if (!schoolYearId || !classId || !periodId) {
                    setError("Choisissez l'année, la classe et la période.")
                    return
                  }
                  generate.mutate()
                }}
                className="school-btn-primary disabled:opacity-60"
                disabled={!canGenerate}
              >
                {generate.isPending ? 'Génération…' : '⚙️ Générer'}
              </button>
            ) : (
              <span
                className="rounded-2xl border border-school-line bg-white px-3 py-2 text-xs font-semibold text-school-inkmuted"
                title="Seuls les comptes autorisés peuvent lancer une génération."
              >
                Consultation seule
              </span>
            )}
          </>
        }
      />

      {/* Workflow steps */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-school-line bg-white px-4 py-3 text-xs font-semibold text-school-inkmuted">
        <Step n={1} label="Saisir les notes" done={false} link="/notes/saisie-classe" />
        <Arrow />
        <Step n={2} label="Générer" done={!!data && data.items.length > 0} />
        <Arrow />
        <Step n={3} label="Vérifier &amp; publier" done={data?.items.some((r) => r.status === 'published') ?? false} />
        <Arrow />
        <Step n={4} label="Télécharger PDF" done={false} />
      </div>

      {error && (
        <ErrorState title="Action impossible" fallback={error} />
      )}
      {isError && (
        <ErrorState
          error={qerr}
          fallback="Impossible de charger la liste des bulletins."
          onRetry={() => void refetch()}
        />
      )}

      <section
        className="school-section space-y-4"
      >
        <SectionTitle
          emoji="🧭"
          title="Filtres de génération"
          hint="Choisissez année, classe et période pour afficher ou générer les bulletins."
          iconClassName="bg-school-sunsoft text-[#8A6A00]"
        />
        <div className={`grid gap-3 ${simpleMode ? 'md:grid-cols-4' : 'md:grid-cols-5'}`}>
        <Field label="Année scolaire">
          <select
            value={schoolYearId || ''}
            onChange={(e) => {
              setSchoolYearId(Number(e.target.value))
              setClassId(0)
              setPeriodId(0)
              setStudentId(null)
            }}
            className="school-select"
          >
            <option value="">—</option>
            {years?.items.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Classe">
          <select
            value={classId || ''}
            onChange={(e) => {
              setClassId(Number(e.target.value))
              setStudentId(null)
            }}
            disabled={!schoolYearId}
            className="school-select disabled:opacity-60"
          >
            <option value="">—</option>
            {classes?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Période">
          <select
            value={periodId || ''}
            onChange={(e) => setPeriodId(Number(e.target.value))}
            disabled={!schoolYearId}
            className="school-select disabled:opacity-60"
          >
            <option value="">—</option>
            {periods?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Élève">
          <SearchSelect
            value={studentId}
            onChange={setStudentId}
            options={studentOptions}
            placeholder="Filtrer par élève"
            disabled={!classId}
            className="mt-1"
          />
        </Field>

        {!simpleMode && (
          <Field label="Statut">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="school-select"
            >
              <option value="">Tous</option>
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
              <option value="archived">Archivé</option>
            </select>
          </Field>
        )}
        </div>
      </section>

      {isLoading && <LoadingState label="Chargement des bulletins…" lines={4} />}

      {data && data.items.length === 0 && (
        <EmptyState
          emoji="📄"
          title="Aucun bulletin pour ces critères"
          hint="Sélectionnez classe et période, puis cliquez sur « Générer » pour produire les bulletins du trimestre."
          action={
            <button type="button" onClick={() => void refetch()} className="school-btn-secondary">
              Réessayer
            </button>
          }
        />
      )}

      {data && data.items.length > 0 && (
        <section className="space-y-3">
          <SectionTitle
            emoji="📘"
            title="Bulletins générés"
            hint="Consultez les résultats puis téléchargez le PDF."
            iconClassName="bg-school-mist text-school-skydeep"
          />
          <div className="school-table-wrap">
            <table className="school-table">
              <thead>
                <tr>
                  {!simpleMode && <th className="w-16">#</th>}
                  <th>Élève</th>
                  <th className="w-44">Classe</th>
                  <th className="w-44">Période</th>
                  <th className="w-44">Moyenne</th>
                  <th className="w-24">Rang</th>
                  <th className="w-28">Abs / Ret</th>
                  {!simpleMode && <th className="w-28">Statut</th>}
                  <th className="w-36 text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((rc) => {
                const avg = rc.period_average ? parseFloat(rc.period_average) : null
                const avgPct =
                  avg != null
                    ? Math.max(0, Math.min(100, Math.round((avg / 20) * 100)))
                    : 0
                const avgTone =
                  avg == null
                    ? 'bg-school-line'
                    : avg >= 14
                      ? 'bg-gradient-to-r from-school-mint to-school-leafdeep'
                      : avg >= 10
                        ? 'bg-gradient-to-r from-school-sun to-school-mango'
                        : 'bg-gradient-to-r from-school-coral to-school-cherry'
                  return (
                  <tr key={rc.id}>
                    {!simpleMode && (
                      <td className="font-mono text-xs text-school-inkmuted">
                        {rc.id}
                      </td>
                    )}
                    <td>
                      <Link
                        to={`/bulletins/${rc.id}`}
                        className="flex items-center gap-3 font-semibold text-school-ink hover:text-school-grape"
                      >
                        <StudentAvatar
                          firstName={rc.student_name ?? undefined}
                          lastName={rc.student_name ?? undefined}
                          seed={rc.student_id}
                        />
                        <span className="flex flex-col">
                          <span className="leading-tight">
                            {rc.student_name ?? 'Non défini'}
                          </span>
                          {rc.student_code ? (
                            <span className="text-[11px] font-normal text-school-inkmuted">
                              {rc.student_code}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </td>
                    <td>{rc.class_name ?? 'Non défini'}</td>
                    <td>{rc.evaluation_period_name ?? 'Non défini'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base font-bold tabular-nums text-school-grape">
                          {rc.period_average ?? '—'}
                        </span>
                        {rc.period_average && (
                          <span className="text-[11px] font-semibold text-school-inkmuted">
                            /20
                          </span>
                        )}
                      </div>
                      <div className="school-stat-bar mt-1.5">
                        <div
                          className={`school-stat-bar-fill ${avgTone}`}
                          style={{ width: `${avgPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="tabular-nums">
                      {rc.rank ? (
                        <>
                          <span className="font-bold text-school-skydeep">{rc.rank}</span>
                          <span className="text-school-inkmuted">
                            {' '}
                            / {rc.rank_out_of ?? '—'}
                          </span>
                        </>
                      ) : (
                        <span className="text-school-inkmuted">—</span>
                      )}
                    </td>
                    <td className="tabular-nums">
                      <span className="school-pill-coral mr-1">{rc.absent_count}</span>
                      <span className="school-pill-sun">{rc.late_count}</span>
                    </td>
                    {!simpleMode && (
                      <td>
                        <span className={STATUS_PILL[rc.status] ?? 'school-pill-muted'}>
                          {STATUS_LABEL[rc.status] ?? rc.status}
                        </span>
                      </td>
                    )}
                    <td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        {rc.status === 'draft' && hasPermission('report_cards.manage') && (
                          <button
                            type="button"
                            disabled={publishOne.isPending}
                            onClick={() => publishOne.mutate(rc.id)}
                            className="inline-flex items-center gap-1 rounded-2xl border-2 border-school-mint/40 bg-white px-3 py-1.5 text-xs font-bold text-school-leafdeep hover:bg-school-mint/10 disabled:opacity-60"
                          >
                            ✅ Publier
                          </button>
                        )}
                        <Link
                          to={`/bulletins/${rc.id}`}
                          className="inline-flex items-center gap-1 rounded-2xl border-2 border-school-sky/30 bg-white px-3 py-1.5 text-xs font-bold text-school-skydeep hover:bg-school-mist/30"
                        >
                          👁️ Voir
                        </Link>
                        <button
                          type="button"
                          onClick={() => reportCardsApi.downloadReportCardPdf(rc.id)}
                          className="inline-flex items-center gap-1 rounded-2xl border-2 border-school-grape/30 bg-white px-3 py-1.5 text-xs font-bold text-school-grape hover:bg-school-grape/5"
                        >
                          ⬇ PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
        {label}
      </span>
      {children}
    </label>
  )
}

function Step({
  n,
  label,
  done,
  link,
}: {
  n: number
  label: string
  done: boolean
  link?: string
}) {
  const inner = (
    <span
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
        done
          ? 'bg-school-mint/20 text-school-leafdeep'
          : 'bg-school-line text-school-inkmuted'
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black ${
          done ? 'bg-school-leafdeep text-white' : 'bg-school-inkmuted/30 text-school-inkmuted'
        }`}
      >
        {done ? '✓' : n}
      </span>
      {label}
    </span>
  )
  return link ? (
    <Link to={link} className="hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  )
}

function Arrow() {
  return <span className="text-school-inkmuted/50 select-none">›</span>
}
