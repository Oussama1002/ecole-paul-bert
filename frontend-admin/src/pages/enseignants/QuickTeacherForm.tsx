import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as teachersApi from '../../api/teachers'

/**
 * Simple-mode teacher form.
 *
 * Mirrors `QuickStudentForm`: only the essentials a primary-school director
 * needs to onboard a new teacher in under a minute. Advanced fields (salaire,
 * années d'expérience, qualification, contact urgence, etc.) still exist
 * server-side and remain editable in advanced mode.
 *
 * Fields kept:
 *   - prénom, nom (required)
 *   - matricule (required, auto-suggested)
 *   - email (optional)
 *   - téléphone (optional)
 *
 * Defaults applied silently:
 *   - status = "active"
 *   - employment_type = "full_time"
 */
function suggestEmployeeCode(): string {
  const y = new Date().getFullYear()
  const r = Math.floor(Math.random() * 9000 + 1000)
  return `ENS-${y}-${r}`
}

export function QuickTeacherForm({
  existing,
  teacherId,
}: {
  existing?: teachersApi.Teacher
  teacherId?: number
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = !existing

  const [employeeCode, setEmployeeCode] = useState(
    existing?.employee_code ?? suggestEmployeeCode()
  )
  const [firstName, setFirstName] = useState(existing?.first_name ?? '')
  const [lastName, setLastName] = useState(existing?.last_name ?? '')
  const [email, setEmail] = useState(existing?.email ?? '')
  const [phone, setPhone] = useState(existing?.phone ?? '')
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async () => {
      const payload: teachersApi.TeacherPayload = {
        employee_code: employeeCode.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        employment_type: existing?.employment_type ?? 'full_time',
        status: existing?.status ?? 'active',
      }
      if (isNew) return teachersApi.createTeacher(payload)
      if (teacherId == null) throw new Error('Identifiant enseignant manquant.')
      return teachersApi.updateTeacher(teacherId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      navigate('/enseignants')
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          to="/enseignants"
          className="text-sm font-semibold text-school-grape underline-offset-4 hover:underline"
        >
          ← Retour aux enseignants
        </Link>
        <h2 className="mt-3 font-display text-2xl font-bold text-school-ink sm:text-3xl">
          {isNew ? 'Nouvel enseignant' : "Modifier l'enseignant"}
        </h2>
        <p className="mt-1 text-sm text-school-inkmuted">
          Remplissez l&apos;essentiel — vous pourrez compléter la fiche plus
          tard.
        </p>
      </div>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          setError(null)
          save.mutate()
        }}
        className="space-y-5 rounded-3xl border-2 border-school-border/70 bg-white p-5 shadow-school sm:p-8"
      >
        {error && (
          <p className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-medium text-school-coral">
            {error}
          </p>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-school-mist text-lg">
              👩‍🏫
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
                placeholder="Sara"
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
                placeholder="Bennis"
                className="school-input"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Matricule *
              </span>
              <div className="flex gap-2">
                <input
                  required
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="ENS-2026-0001"
                  className="school-input flex-1 font-mono tracking-tight"
                />
                {isNew ? (
                  <button
                    type="button"
                    onClick={() => setEmployeeCode(suggestEmployeeCode())}
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

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-school-sunsoft text-lg">
              📞
            </span>
            <h3 className="font-display text-lg font-semibold text-school-ink">
              Contact
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@exemple.ma"
                className="school-input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Téléphone
              </span>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className="school-input"
              />
            </label>
          </div>
        </section>

        <div className="flex flex-col-reverse items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
          <Link to="/enseignants" className="school-btn-secondary text-center">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={save.isPending}
            className="school-btn-primary disabled:opacity-60"
          >
            {save.isPending
              ? 'Enregistrement…'
              : isNew
                ? "Enregistrer l'enseignant"
                : 'Mettre à jour'}
          </button>
        </div>
      </form>
    </div>
  )
}
