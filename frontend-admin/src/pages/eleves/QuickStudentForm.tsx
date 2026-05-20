import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as classesApi from '../../api/classes'
import * as schoolYearsApi from '../../api/schoolYears'
import * as studentsApi from '../../api/students'
import { useCurrentSchoolYear } from '../../hooks/useCurrentSchoolYear'
import { getApiErrorMessage } from '../../utils/apiError'

/**
 * Simple-mode student form.
 *
 * Ships with the absolute minimum fields the school director asked for:
 *   - prénom, nom
 *   - date de naissance
 *   - 2 à 3 téléphones parents
 *   - adresse
 *   - code élève (auto-suggéré)
 *
 * Target UX: create a new student in under 1 minute, fully usable on a
 * tablet. The advanced fields (status, gender, nationalité, médical…) still
 * exist server-side; they simply default to `null` / `active` until a user
 * switches to advanced mode and fills them in.
 */
export function QuickStudentForm({
  existing,
  studentId,
  onClose,
}: {
  existing?: studentsApi.Student
  studentId?: number
  onClose?: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = !existing

  const [studentCode, setStudentCode] = useState(existing?.student_code ?? '')
  const [firstName, setFirstName] = useState(existing?.first_name ?? '')
  const [lastName, setLastName] = useState(existing?.last_name ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(existing?.date_of_birth ?? '')
  const [address, setAddress] = useState(existing?.address ?? '')
  const [phone1, setPhone1] = useState(existing?.parent_phone_1 ?? '')
  const [phone2, setPhone2] = useState(existing?.parent_phone_2 ?? '')
  const [phone3, setPhone3] = useState(existing?.parent_phone_3 ?? '')
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [classId, setClassId] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const { id: defaultYearId } = useCurrentSchoolYear()

  const { data: years } = useQuery({
    queryKey: ['school-years-all'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 100,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
    enabled: isNew,
  })

  useEffect(() => {
    if (!isNew || schoolYearId > 0 || !defaultYearId) return
    setSchoolYearId(defaultYearId)
  }, [isNew, schoolYearId, defaultYearId])

  const { data: classes } = useQuery({
    queryKey: ['classes-student-form', schoolYearId],
    queryFn: () =>
      classesApi.fetchClasses({
        per_page: 100,
        school_year_id: schoolYearId,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    enabled: isNew && schoolYearId > 0,
  })

  const { data: suggested } = useQuery({
    queryKey: ['next-student-code'],
    queryFn: studentsApi.fetchNextStudentCode,
    enabled: isNew && studentCode === '',
    staleTime: 0,
  })

  useEffect(() => {
    if (isNew && suggested && studentCode === '') {
      setStudentCode(suggested)
    }
  }, [isNew, suggested, studentCode])

  const save = useMutation({
    mutationFn: async () => {
      const payload: studentsApi.StudentPayload = {
        student_code: studentCode.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dateOfBirth,
        address: address.trim() || null,
        parent_phone_1: phone1.trim() || null,
        parent_phone_2: phone2.trim() || null,
        parent_phone_3: phone3.trim() || null,
      }
      if (isNew) {
        if (schoolYearId > 0 && classId > 0) {
          payload.school_year_id = schoolYearId
          payload.class_id = classId
        }
        return studentsApi.createStudent(payload)
      }
      if (studentId == null) {
        throw new Error('Identifiant élève manquant.')
      }
      return studentsApi.updateStudent(studentId, payload)
    },
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['next-student-code'] })
      queryClient.invalidateQueries({ queryKey: ['student', student.id] })
      // Always navigate to the new student's detail page so the user has a clear
      // confirmation — even when the form is opened in a modal. For an edit,
      // close the modal in place (or return to the list when not modal).
      if (isNew && onClose) {
        onClose()
        navigate('/eleves', {
          state: { flash: `Élève ${student.first_name} ${student.last_name} enregistré.` },
        })
      } else if (isNew) {
        navigate(`/eleves/${student.id}`, {
          state: { flash: `Élève ${student.first_name} ${student.last_name} enregistré.` },
        })
      } else if (onClose) {
        onClose()
      } else {
        navigate('/eleves', { state: { flash: 'Fiche mise à jour.' } })
      }
    },
    onError: (e) =>
      setError(getApiErrorMessage(e, "Impossible d'enregistrer l'élève.")),
  })

  const regenerateCode = async () => {
    try {
      const code = await studentsApi.fetchNextStudentCode()
      setStudentCode(code)
    } catch {
      // silently ignored — the user can still type a code manually
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {!onClose && (
        <div className="mb-6">
          <Link
            to="/eleves"
            className="text-sm font-semibold text-school-grape underline-offset-4 hover:underline"
          >
            ← Retour aux élèves
          </Link>
          <h2 className="mt-3 font-display text-2xl font-bold text-school-ink sm:text-3xl">
            {isNew ? 'Nouvel élève' : "Modifier l'élève"}
          </h2>
          <p className="mt-1 text-sm text-school-inkmuted">
            Remplissez l'essentiel — vous pourrez compléter la fiche plus tard.
          </p>
        </div>
      )}

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          setError(null)
          if (!firstName.trim() || !lastName.trim()) {
            setError('Indiquez le prénom et le nom.')
            return
          }
          if (!dateOfBirth) {
            setError('Indiquez la date de naissance.')
            return
          }
          if (!studentCode.trim()) {
            setError("Indiquez le code ou matricule de l'élève.")
            return
          }
          if (!phone1.trim() && !phone2.trim() && !phone3.trim()) {
            setError('Indiquez au moins un téléphone parent.')
            return
          }
          if (isNew && (!schoolYearId || !classId)) {
            setError('Choisissez l’année scolaire et la classe pour afficher l’élève dans la liste.')
            return
          }
          save.mutate()
        }}
        className="space-y-5 rounded-3xl border-2 border-school-border/70 bg-white p-5 shadow-school sm:p-8"
      >
        {error && (
          <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-medium text-school-coral">
            {error}
          </p>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-school-sunsoft text-lg">
              🎒
            </span>
            <h3 className="font-display text-lg font-semibold text-school-ink">
              Identité
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Prénom *
              </span>
              <input
                required
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Yasmine"
                className="school-input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Nom *
              </span>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="El Amrani"
                className="school-input"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Date de naissance *
              </span>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="school-input"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Code / Matricule *
              </span>
              <div className="flex gap-2">
                <input
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="EPB-2026-0001"
                  className="school-input flex-1 font-mono tracking-tight"
                />
                {isNew ? (
                  <button
                    type="button"
                    onClick={regenerateCode}
                    className="rounded-2xl border-2 border-school-grape/30 bg-white px-3 py-2 text-xs font-bold text-school-grape hover:bg-school-grape/5"
                    title="Proposer un nouveau code"
                  >
                    Auto
                  </button>
                ) : null}
              </div>
            </label>
          </div>
        </section>

        {isNew ? (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-school-lilac/30 text-lg">
                🏫
              </span>
              <h3 className="font-display text-lg font-semibold text-school-ink">
                Inscription (année en cours)
              </h3>
            </div>
            <p className="text-sm text-school-inkmuted">
              Obligatoire pour que l’élève apparaisse dans la liste filtrée par année.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                  Année scolaire *
                </span>
                <select
                  required
                  value={schoolYearId || ''}
                  onChange={(e) => {
                    setSchoolYearId(Number(e.target.value) || 0)
                    setClassId(0)
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
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                  Classe *
                </span>
                <select
                  required
                  value={classId || ''}
                  onChange={(e) => setClassId(Number(e.target.value) || 0)}
                  className="school-select"
                  disabled={schoolYearId <= 0}
                >
                  <option value="">—</option>
                  {classes?.items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-school-mist text-lg">
              📞
            </span>
            <h3 className="font-display text-lg font-semibold text-school-ink">
              Téléphones des parents
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Parent 1
              </span>
              <input
                type="tel"
                inputMode="tel"
                value={phone1}
                onChange={(e) => setPhone1(e.target.value)}
                placeholder="06 12 34 56 78"
                className="school-input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Parent 2
              </span>
              <input
                type="tel"
                inputMode="tel"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                placeholder="06 00 00 00 00"
                className="school-input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Autre contact
              </span>
              <input
                type="tel"
                inputMode="tel"
                value={phone3}
                onChange={(e) => setPhone3(e.target.value)}
                placeholder="Optionnel"
                className="school-input"
              />
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-school-sunsoft text-lg">
              🏡
            </span>
            <h3 className="font-display text-lg font-semibold text-school-ink">
              Adresse
            </h3>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Adresse du domicile
            </span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="N°, rue, quartier, ville"
              className="school-input"
            />
          </label>
        </section>

        <div className="flex flex-col-reverse items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
          {onClose ? (
            <button type="button" onClick={onClose} className="school-btn-secondary text-center">
              Annuler
            </button>
          ) : (
            <Link to="/eleves" className="school-btn-secondary text-center">
              Annuler
            </Link>
          )}
          <button
            type="submit"
            disabled={save.isPending}
            className="school-btn-primary disabled:opacity-60"
          >
            {save.isPending
              ? 'Enregistrement…'
              : isNew
                ? "Enregistrer l'élève"
                : 'Mettre à jour'}
          </button>
        </div>
      </form>
    </div>
  )
}
