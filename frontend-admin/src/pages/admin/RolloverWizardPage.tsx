import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as classesApi from '../../api/classes'
import * as enrollmentsApi from '../../api/enrollments'
import * as schoolYearsApi from '../../api/schoolYears'
import * as studentsApi from '../../api/students'
import { PageHeader } from '../../components/ui/PageHeader'
import { getApiErrorMessage } from '../../utils/apiError'

type WizardStep = 1 | 2 | 3 | 4

export function RolloverWizardPage() {
  const [step, setStep] = useState<WizardStep>(1)
  const [newYearName, setNewYearName] = useState('')
  const [newYearStart, setNewYearStart] = useState('')
  const [newYearEnd, setNewYearEnd] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [newYear, setNewYear] = useState<schoolYearsApi.SchoolYear | null>(null)
  const [progress, setProgress] = useState<{ classesCreated: number; enrollmentsCreated: number } | null>(null)

  const { data: years } = useQuery({
    queryKey: ['school-years-rollover'],
    queryFn: () => schoolYearsApi.fetchSchoolYears({ per_page: 10, sort_by: 'start_date', sort_order: 'desc' }),
  })

  const currentYear = years?.items.find((y) => y.is_current) ?? years?.items[0] ?? null

  const { data: currentClasses } = useQuery({
    queryKey: ['classes-rollover', currentYear?.id],
    queryFn: () =>
      classesApi.fetchClasses({ per_page: 200, school_year_id: currentYear!.id, sort_by: 'name', sort_order: 'asc' }),
    enabled: !!currentYear,
  })

  const { data: currentStudents } = useQuery({
    queryKey: ['students-rollover', currentYear?.id],
    queryFn: () =>
      studentsApi.fetchStudents({ per_page: 1, school_year_id: currentYear!.id }),
    enabled: !!currentYear,
  })

  const createYear = useMutation({
    mutationFn: () => {
      if (!newYearName.trim() || !newYearStart || !newYearEnd) {
        throw new Error('Renseignez le nom, la date de début et la date de fin.')
      }
      return schoolYearsApi.createSchoolYear({
        name: newYearName.trim(),
        start_date: newYearStart,
        end_date: newYearEnd,
        status: 'active',
        is_current: true,
      })
    },
    onSuccess: (y) => {
      setNewYear(y)
      setError(null)
      setStep(3)
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de créer l\'année scolaire.')),
  })

  const rollover = useMutation({
    mutationFn: async () => {
      if (!currentYear || !newYear || !currentClasses) {
        throw new Error('Données manquantes.')
      }
      let classesCreated = 0
      let enrollmentsCreated = 0
      const classMap: Record<number, number> = {}

      for (const cls of currentClasses.items) {
        const created = await classesApi.createClass({
          level_id: cls.level_id,
          school_year_id: newYear.id,
          name: cls.name,
          code: cls.code,
          section: cls.section,
          max_students: cls.max_students,
          room_label: cls.room_label,
          main_teacher_id: cls.main_teacher_id,
          status: 'active',
        })
        classMap[cls.id] = created.id
        classesCreated++
        setProgress({ classesCreated, enrollmentsCreated })
      }

      for (const cls of currentClasses.items) {
        const newClassId = classMap[cls.id]
        if (!newClassId) continue

        let page = 1
        let hasMore = true
        while (hasMore) {
          const batch = await enrollmentsApi.fetchEnrollments({
            school_year_id: currentYear.id,
            class_id: cls.id,
            per_page: 50,
            page,
          })
          for (const enr of batch.items) {
            const enrollDate = new Date().toISOString().slice(0, 10)
            await enrollmentsApi.createEnrollment({
              student_id: enr.student_id,
              school_year_id: newYear.id,
              class_id: newClassId,
              enrollment_number: enr.enrollment_number,
              enrollment_date: enrollDate,
              academic_status: 'active',
              admission_type: 'rollover',
              registration_status: 'confirmed',
            })
            enrollmentsCreated++
            setProgress({ classesCreated, enrollmentsCreated })
          }
          hasMore = batch.meta.current_page < batch.meta.last_page
          page++
        }
      }

      return { classesCreated, enrollmentsCreated }
    },
    onSuccess: (result) => {
      setProgress(result)
      setError(null)
      setStep(4)
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Erreur pendant la migration des données.')),
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        emoji="🔄"
        title="Passage à la nouvelle année"
        subtitle="Ce wizard copie les classes et les inscriptions vers la nouvelle année scolaire."
      />

      <StepIndicator current={step} />

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="school-section space-y-4">
          <h3 className="font-semibold text-school-ink">1. Année en cours</h3>
          {!currentYear ? (
            <p className="text-sm text-school-inkmuted">Chargement…</p>
          ) : (
            <>
              <div className="rounded-xl border border-school-line bg-school-sunsoft/20 px-4 py-3">
                <p className="font-bold text-school-ink">{currentYear.name}</p>
                <p className="text-sm text-school-inkmuted">
                  {currentYear.start_date} → {currentYear.end_date}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Classes" value={currentClasses?.meta.total ?? '…'} />
                <Stat label="Élèves inscrits" value={currentStudents?.meta.total ?? '…'} />
              </div>
              <p className="text-sm text-school-inkmuted">
                Ces classes et inscriptions seront copiées vers la nouvelle année.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="school-btn-primary"
                >
                  Continuer →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="school-section space-y-4">
          <h3 className="font-semibold text-school-ink">2. Nouvelle année scolaire</h3>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Nom de l'année
              </span>
              <input
                type="text"
                value={newYearName}
                onChange={(e) => setNewYearName(e.target.value)}
                placeholder="ex : 2025-2026"
                className="school-input w-full"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                  Date de début
                </span>
                <input
                  type="date"
                  value={newYearStart}
                  onChange={(e) => setNewYearStart(e.target.value)}
                  className="school-input w-full"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                  Date de fin
                </span>
                <input
                  type="date"
                  value={newYearEnd}
                  onChange={(e) => setNewYearEnd(e.target.value)}
                  className="school-input w-full"
                />
              </label>
            </div>
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="school-btn-secondary">
              ← Retour
            </button>
            <button
              type="button"
              onClick={() => createYear.mutate()}
              disabled={createYear.isPending}
              className="school-btn-primary disabled:opacity-60"
            >
              {createYear.isPending ? 'Création…' : 'Créer et continuer →'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="school-section space-y-4">
          <h3 className="font-semibold text-school-ink">3. Copie des données</h3>
          {newYear && (
            <div className="rounded-xl border border-school-line bg-school-mint/10 px-4 py-3">
              <p className="font-bold text-school-leafdeep">✓ Année créée : {newYear.name}</p>
            </div>
          )}
          {rollover.isPending && progress && (
            <div className="space-y-2 text-sm text-school-inkmuted">
              <p>⏳ Classes créées : <strong>{progress.classesCreated}</strong></p>
              <p>⏳ Inscriptions créées : <strong>{progress.enrollmentsCreated}</strong></p>
            </div>
          )}
          {!rollover.isPending && !rollover.isSuccess && (
            <p className="text-sm text-school-inkmuted">
              Cliquez sur « Lancer la migration » pour copier les{' '}
              <strong>{currentClasses?.meta.total ?? 0}</strong> classes et toutes les
              inscriptions vers <strong>{newYear?.name}</strong>.
            </p>
          )}
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="school-btn-secondary" disabled={rollover.isPending}>
              ← Retour
            </button>
            <button
              type="button"
              onClick={() => rollover.mutate()}
              disabled={rollover.isPending}
              className="school-btn-primary disabled:opacity-60"
            >
              {rollover.isPending ? 'Migration en cours…' : '🚀 Lancer la migration'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="school-section space-y-4">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="text-5xl">🎉</span>
            <h3 className="text-xl font-bold text-school-ink">Migration terminée</h3>
            {progress && (
              <div className="grid grid-cols-2 gap-4 text-left">
                <Stat label="Classes créées" value={progress.classesCreated} />
                <Stat label="Inscriptions créées" value={progress.enrollmentsCreated} />
              </div>
            )}
            <p className="max-w-sm text-sm text-school-inkmuted">
              La nouvelle année <strong>{newYear?.name}</strong> est maintenant active.
              Vérifiez les classes et périodes d'évaluation avant d'ouvrir la saisie des notes.
            </p>
            <div className="flex gap-3">
              <Link to="/parametrage/annees-scolaires" className="school-btn-secondary">
                Voir les années
              </Link>
              <Link to="/parametrage/classes" className="school-btn-primary">
                Voir les classes
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StepIndicator({ current }: { current: WizardStep }) {
  const steps = [
    { n: 1, label: 'Année en cours' },
    { n: 2, label: 'Nouvelle année' },
    { n: 3, label: 'Migration' },
    { n: 4, label: 'Terminé' },
  ]
  return (
    <div className="flex items-center justify-between rounded-2xl border border-school-line bg-white px-4 py-3">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              current === s.n
                ? 'bg-school-grape text-white'
                : current > s.n
                  ? 'bg-school-leafdeep text-white'
                  : 'bg-school-line text-school-inkmuted'
            }`}
          >
            {current > s.n ? '✓' : s.n}
          </div>
          <span
            className={`hidden text-xs font-semibold sm:block ${
              current === s.n ? 'text-school-grape' : 'text-school-inkmuted'
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <span className="mx-2 text-school-inkmuted/40">›</span>
          )}
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-school-line bg-school-canvas px-4 py-3 text-center">
      <p className="text-2xl font-black text-school-grape">{value}</p>
      <p className="text-xs font-semibold text-school-inkmuted">{label}</p>
    </div>
  )
}
