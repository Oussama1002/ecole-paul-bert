import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../api/simpleSchoolSettings'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiError'

/**
 * Essential school settings for the director in simple mode:
 * identity, bulletin header/footer, absence alert thresholds, journal label ideas.
 */
export function SimpleSchoolSettingsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['simple-school-settings'],
    queryFn: api.fetchSimpleSchoolSettings,
  })

  const [school, setSchool] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
  })
  const [bulletin, setBulletin] = useState({
    title: '',
    signature_line: '',
    footer_line: '',
    show_attendance: true,
    show_ranking: true,
    principal_comment: '',
    teacher_comment: '',
  })
  const [alerts, setAlerts] = useState({
    window_days: 30,
    unjustified_absences: 3,
    late_count: 5,
  })
  const [currentSchoolYearId, setCurrentSchoolYearId] = useState<number | null>(null)
  const [incomeLines, setIncomeLines] = useState('')
  const [expenseLines, setExpenseLines] = useState('')
  const [formErr, setFormErr] = useState<string | null>(null)
  const [formOk, setFormOk] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [logoErr, setLogoErr] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setSchool({
      name: data.school.name,
      address: data.school.address,
      city: data.school.city,
      phone: data.school.phone,
      email: data.school.email,
    })
    setBulletin({ ...data.bulletin })
    setAlerts({ ...data.attendance_alerts })
    setCurrentSchoolYearId(data.current_school_year.id)
    setIncomeLines(data.finance_journal.income_labels.join('\n'))
    setExpenseLines(data.finance_journal.expense_labels.join('\n'))
  }, [data])

  const save = useMutation({
    mutationFn: () =>
      api.patchSimpleSchoolSettings({
        school,
        bulletin,
        attendance_alerts: alerts,
        current_school_year_id: currentSchoolYearId,
        finance_journal: {
          income_labels: linesToList(incomeLines),
          expense_labels: linesToList(expenseLines),
        },
      }),
    onSuccess: () => {
      setFormErr(null)
      setFieldErrors({})
      setFormOk('Les réglages ont été enregistrés avec succès.')
      void queryClient.invalidateQueries({ queryKey: ['simple-school-settings'] })
    },
    onError: (e) => {
      setFormOk(null)
      setFormErr(getApiErrorMessage(e, 'Enregistrement impossible.'))
      setFieldErrors(getApiFieldErrors(e))
    },
  })

  const uploadLogo = useMutation({
    mutationFn: (file: File) => api.uploadSchoolLogo(file),
    onSuccess: () => {
      setLogoErr(null)
      void queryClient.invalidateQueries({ queryKey: ['simple-school-settings'] })
    },
    onError: (e) => setLogoErr(getApiErrorMessage(e, 'Envoi du logo impossible.')),
  })

  const canEdit = data?.meta.can_edit ?? false

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setFieldErrors({})
    setFormErr(null)
    setFormOk(null)
    save.mutate()
  }

  const fieldError = (path: string) => fieldErrors[path]?.[0] ?? null

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !canEdit) return
    uploadLogo.mutate(f)
  }

  if (isLoading && !data) {
    return (
      <div className="school-section p-8 text-center text-school-inkmuted">
        Chargement des réglages…
      </div>
    )
  }

  if (error) {
    return (
      <div className="school-section p-8 text-center text-[#B23A2E]">
        {getApiErrorMessage(error, 'Impossible de charger les réglages.')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="🏫"
        title="Réglages de l’école"
        subtitle="Nom, logo, contacts, année en cours, marque du bulletin et paramètres simples du quotidien."
      />

      {!canEdit && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Consultation seule : seuls la direction ou l’administration peuvent modifier
          ces paramètres.
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-8"
        aria-busy={isLoading || !data}
      >
        <section className="school-section space-y-4">
          <SectionTitle emoji="🖼️" title="Logo de l’école" />
          <p className="text-sm text-school-inkmuted">
            Affiché en petit en haut des bulletins PDF. Format carré ou vertical, JPG
            ou PNG, 2 Mo max.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            {data?.school.logo_url ? (
              <img
                src={data.school.logo_url}
                alt="Logo actuel"
                className="h-20 w-auto max-w-[200px] rounded-xl border border-school-line bg-white object-contain p-2"
              />
            ) : (
              <div className="flex h-20 w-28 items-center justify-center rounded-xl border border-dashed border-school-line bg-school-mist/30 text-xs text-school-inkmuted">
                Aucun logo
              </div>
            )}
            <label className={canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}>
              <span className="school-btn-primary inline-block px-4 py-2 text-sm">
                {uploadLogo.isPending ? 'Envoi…' : 'Changer le logo'}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={!canEdit || uploadLogo.isPending}
                onChange={onLogoChange}
              />
            </label>
          </div>
          {logoErr && <p className="text-sm font-semibold text-[#B23A2E]">{logoErr}</p>}
        </section>

        <section className="school-section space-y-4">
          <SectionTitle emoji="📇" title="Identité de l’établissement" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom de l’école">
              <input
                className="school-input"
                value={school.name}
                onChange={(e) => setSchool((s) => ({ ...s, name: e.target.value }))}
                disabled={!canEdit}
                maxLength={150}
              />
              {fieldError('school.name') ? <FieldError message={fieldError('school.name')} /> : null}
            </Field>
            <Field label="Téléphone">
              <input
                className="school-input"
                value={school.phone}
                onChange={(e) => setSchool((s) => ({ ...s, phone: e.target.value }))}
                disabled={!canEdit}
                maxLength={50}
              />
              {fieldError('school.phone') ? <FieldError message={fieldError('school.phone')} /> : null}
            </Field>
            <Field label="Adresse (rue)">
              <input
                className="school-input"
                value={school.address}
                onChange={(e) => setSchool((s) => ({ ...s, address: e.target.value }))}
                disabled={!canEdit}
                maxLength={255}
              />
              {fieldError('school.address') ? <FieldError message={fieldError('school.address')} /> : null}
            </Field>
            <Field label="Ville">
              <input
                className="school-input"
                value={school.city}
                onChange={(e) => setSchool((s) => ({ ...s, city: e.target.value }))}
                disabled={!canEdit}
                maxLength={100}
              />
              {fieldError('school.city') ? <FieldError message={fieldError('school.city')} /> : null}
            </Field>
            <Field label="E-mail" className="sm:col-span-2">
              <input
                type="email"
                className="school-input"
                value={school.email}
                onChange={(e) => setSchool((s) => ({ ...s, email: e.target.value }))}
                disabled={!canEdit}
                maxLength={150}
              />
              {fieldError('school.email') ? <FieldError message={fieldError('school.email')} /> : null}
            </Field>
          </div>
        </section>

        <section className="school-section space-y-4">
          <SectionTitle emoji="🗓️" title="Année scolaire en cours" />
          <p className="text-sm text-school-inkmuted">
            Cette année est utilisée par défaut dans les écrans simples
            (tableau de bord, absences, finances).
          </p>
          <Field label="Année active">
            <select
              className="school-select"
              value={currentSchoolYearId ?? ''}
              onChange={(e) =>
                setCurrentSchoolYearId(e.target.value ? Number(e.target.value) : null)
              }
              disabled={!canEdit}
            >
              <option value="">— Sélectionner —</option>
              {(data?.current_school_year.options ?? []).map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                  {year.is_current ? ' (actuelle)' : ''}
                </option>
              ))}
            </select>
            {fieldError('current_school_year_id') ? (
              <FieldError message={fieldError('current_school_year_id')} />
            ) : null}
          </Field>
        </section>

        {(data?.meta.can_manage_structure ?? false) && (
          <section className="school-section space-y-4">
            <SectionTitle emoji="🏗️" title="Structure pédagogique (gestion simple)" />
            <p className="text-sm text-school-inkmuted">
              Réglez rapidement les niveaux, classes et matières sans ouvrir les paramètres avancés.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <SimpleLinkCard
                to="/ecole/parametres/niveaux"
                title="Niveaux"
                hint="Créer, modifier, archiver les niveaux"
                emoji="🔢"
              />
              <SimpleLinkCard
                to="/ecole/parametres/classes"
                title="Classes"
                hint="Gérer les classes de l’année"
                emoji="🚪"
              />
              <SimpleLinkCard
                to="/ecole/parametres/matieres"
                title="Matières"
                hint="Gérer les matières enseignées"
                emoji="📚"
              />
            </div>
          </section>
        )}

        <section className="school-section space-y-4">
          <SectionTitle emoji="📄" title="Textes sur le bulletin" />
          <p className="text-sm text-school-inkmuted">
            Titre du document, phrase sous la signature et pied de page.
          </p>
          <Field label="Titre du bulletin">
            <input
              className="school-input"
              value={bulletin.title}
              onChange={(e) => setBulletin((b) => ({ ...b, title: e.target.value }))}
              disabled={!canEdit}
              maxLength={150}
            />
            {fieldError('bulletin.title') ? <FieldError message={fieldError('bulletin.title')} /> : null}
          </Field>
          <Field label="Ligne de signature (ex. « Le directeur »)">
            <input
              className="school-input"
              value={bulletin.signature_line}
              onChange={(e) =>
                setBulletin((b) => ({ ...b, signature_line: e.target.value }))
              }
              disabled={!canEdit}
              maxLength={500}
            />
            {fieldError('bulletin.signature_line') ? (
              <FieldError message={fieldError('bulletin.signature_line')} />
            ) : null}
          </Field>
          <Field label="Pied de page">
            <textarea
              className="school-input min-h-[72px]"
              value={bulletin.footer_line}
              onChange={(e) =>
                setBulletin((b) => ({ ...b, footer_line: e.target.value }))
              }
              disabled={!canEdit}
              maxLength={2000}
            />
            {fieldError('bulletin.footer_line') ? (
              <FieldError message={fieldError('bulletin.footer_line')} />
            ) : null}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-medium text-school-ink">
              <input
                type="checkbox"
                checked={bulletin.show_attendance}
                onChange={(e) =>
                  setBulletin((b) => ({ ...b, show_attendance: e.target.checked }))
                }
                disabled={!canEdit}
              />
              Afficher absences et retards
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-school-ink">
              <input
                type="checkbox"
                checked={bulletin.show_ranking}
                onChange={(e) =>
                  setBulletin((b) => ({ ...b, show_ranking: e.target.checked }))
                }
                disabled={!canEdit}
              />
              Afficher le rang
            </label>
          </div>
          <Field label="Commentaire enseignant (facultatif)">
            <textarea
              className="school-input min-h-[72px]"
              value={bulletin.teacher_comment}
              onChange={(e) =>
                setBulletin((b) => ({ ...b, teacher_comment: e.target.value }))
              }
              disabled={!canEdit}
              maxLength={2000}
            />
            {fieldError('bulletin.teacher_comment') ? (
              <FieldError message={fieldError('bulletin.teacher_comment')} />
            ) : null}
          </Field>
          <Field label="Commentaire direction / principal (facultatif)">
            <textarea
              className="school-input min-h-[72px]"
              value={bulletin.principal_comment}
              onChange={(e) =>
                setBulletin((b) => ({ ...b, principal_comment: e.target.value }))
              }
              disabled={!canEdit}
              maxLength={2000}
            />
            {fieldError('bulletin.principal_comment') ? (
              <FieldError message={fieldError('bulletin.principal_comment')} />
            ) : null}
          </Field>
        </section>

        <section className="school-section space-y-4">
          <SectionTitle emoji="🔔" title="Alertes d’absences" />
          <p className="text-sm text-school-inkmuted">
            Quand un élève dépasse ces seuils sur une période glissante, une notification
            est créée pour l’enseignant principal de la classe.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Fenêtre (jours)">
              <input
                type="number"
                min={7}
                max={120}
                className="school-input tabular-nums"
                value={alerts.window_days}
                onChange={(e) =>
                  setAlerts((a) => ({ ...a, window_days: Number(e.target.value) }))
                }
                disabled={!canEdit}
              />
              {fieldError('attendance_alerts.window_days') ? (
                <FieldError message={fieldError('attendance_alerts.window_days')} />
              ) : null}
            </Field>
            <Field label="Absences non justifiées">
              <input
                type="number"
                min={1}
                max={50}
                className="school-input tabular-nums"
                value={alerts.unjustified_absences}
                onChange={(e) =>
                  setAlerts((a) => ({
                    ...a,
                    unjustified_absences: Number(e.target.value),
                  }))
                }
                disabled={!canEdit}
              />
              {fieldError('attendance_alerts.unjustified_absences') ? (
                <FieldError message={fieldError('attendance_alerts.unjustified_absences')} />
              ) : null}
            </Field>
            <Field label="Retards">
              <input
                type="number"
                min={1}
                max={100}
                className="school-input tabular-nums"
                value={alerts.late_count}
                onChange={(e) =>
                  setAlerts((a) => ({ ...a, late_count: Number(e.target.value) }))
                }
                disabled={!canEdit}
              />
              {fieldError('attendance_alerts.late_count') ? (
                <FieldError message={fieldError('attendance_alerts.late_count')} />
              ) : null}
            </Field>
          </div>
        </section>

        <section className="school-section space-y-4">
          <SectionTitle emoji="💶" title="Catégories simplifiées de caisse" />
          <p className="text-sm text-school-inkmuted">
            Une ligne = une suggestion affichée dans la page Caisse (mode simple).
            Cela sert de catégories pratiques, sans complexité comptable.
          </p>
          <Field label="Recettes — une idée par ligne">
            <textarea
              className="school-input min-h-[100px] font-mono text-sm"
              value={incomeLines}
              onChange={(e) => setIncomeLines(e.target.value)}
              disabled={!canEdit}
            />
            {fieldError('finance_journal.income_labels') ? (
              <FieldError message={fieldError('finance_journal.income_labels')} />
            ) : null}
          </Field>
          <Field label="Dépenses — une idée par ligne">
            <textarea
              className="school-input min-h-[100px] font-mono text-sm"
              value={expenseLines}
              onChange={(e) => setExpenseLines(e.target.value)}
              disabled={!canEdit}
            />
            {fieldError('finance_journal.expense_labels') ? (
              <FieldError message={fieldError('finance_journal.expense_labels')} />
            ) : null}
          </Field>
        </section>

        {formErr && (
          <div className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
            ✕ {formErr}
          </div>
        )}
        {formOk && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            ✓ {formOk}
          </div>
        )}

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={save.isPending || !data}
              className="school-btn-primary px-8 disabled:opacity-60"
            >
              {save.isPending ? 'Enregistrement…' : 'Enregistrer tout'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

function SimpleLinkCard({
  to,
  title,
  hint,
  emoji,
}: {
  to: string
  title: string
  hint: string
  emoji: string
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-school-line bg-white px-4 py-3 transition hover:border-school-lilac hover:bg-school-cream"
    >
      <p className="text-sm font-semibold text-school-ink">
        <span aria-hidden className="mr-2">
          {emoji}
        </span>
        {title}
      </p>
      <p className="mt-1 text-xs text-school-inkmuted">{hint}</p>
    </Link>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
        {label}
      </span>
      {children}
    </label>
  )
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="mt-1 text-xs font-semibold text-[#B23A2E]">{message}</p>
}

function linesToList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}
