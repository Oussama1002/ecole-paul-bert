import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import * as usersApi from '../api/users'
import * as rolesApi from '../api/roles'
import * as teachersApi from '../api/teachers'
import { SearchSelect, type SearchSelectOption } from '../components/ui/SearchSelect'
import { getApiErrorMessage, getApiFieldErrors } from '../utils/apiError'

export function UserFormModal({
  userId,
  onClose,
}: {
  userId: number | null
  onClose: () => void
}) {
  const isNew = userId === null
  const queryClient = useQueryClient()

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.fetchRoles,
  })

  const { data: existing, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.fetchUser(userId as number),
    enabled: !isNew && userId != null,
  })

  const [roleId, setRoleId] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('active')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [teacherId, setTeacherId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const selectedRole = roles?.find((r) => r.id === roleId)
  const isTeacherRole = selectedRole?.code === 'teacher'

  const { data: teachers } = useQuery({
    queryKey: ['user-form-teachers'],
    queryFn: () =>
      teachersApi.fetchTeachers({ per_page: 200, sort_by: 'last_name', sort_order: 'asc' }),
    enabled: isTeacherRole && isNew,
  })

  const teacherOptions = useMemo<SearchSelectOption[]>(
    () =>
      (teachers?.items ?? [])
        .filter((t) => t.user_id == null)
        .map((t) => ({
          value: t.id,
          label: `${t.last_name} ${t.first_name}`,
          hint: t.employee_code,
        })),
    [teachers?.items]
  )

  function pickTeacher(id: number | null) {
    setTeacherId(id)
    if (id == null) return
    const t = teachers?.items.find((x) => x.id === id)
    if (!t) return
    if (t.user_id != null) {
      setError('Cet enseignant a déjà un compte utilisateur.')
      return
    }
    setError(null)
    setFirstName(t.first_name)
    setLastName(t.last_name)
    setEmail(t.email ?? '')
    setPhone(t.phone ?? '')
  }

  useEffect(() => {
    if (!existing) return
    setRoleId(existing.role?.id ?? 0)
    setFirstName(existing.first_name)
    setLastName(existing.last_name)
    setEmail(existing.email)
    setPhone(existing.phone ?? '')
    setStatus(existing.status)
    setPassword('')
    setPasswordConfirmation('')
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      if (isNew) {
        return usersApi.createUser({
          role_id: roleId,
          teacher_id: isTeacherRole && teacherId ? teacherId : null,
          first_name: firstName,
          last_name: lastName,
          email: email.trim(),
          phone: phone || null,
          password,
          password_confirmation: passwordConfirmation,
          status,
        })
      }
      const payload: usersApi.UpdateUserPayload = {
        role_id: roleId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        status,
      }
      if (password) {
        payload.password = password
        payload.password_confirmation = passwordConfirmation
      }
      return usersApi.updateUser(userId as number, payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (e: unknown) => {
      setFieldErrors(getApiFieldErrors(e))
      setError(getApiErrorMessage(e, 'Impossible d’enregistrer l’utilisateur.'))
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    if (!roleId) {
      setError('Choisissez un rôle.')
      return
    }
    if (!email.trim()) {
      setError('L’e-mail est obligatoire.')
      return
    }
    if (isNew && password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (isNew && (!password || password !== passwordConfirmation)) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (!isNew && password && password !== passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    save.mutate()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-school-border/70 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-school-line bg-white px-6 py-4">
          <h3 className="font-display text-lg font-bold text-school-ink">
            {isNew ? 'Nouvel utilisateur' : "Modifier l'utilisateur"}
          </h3>
          <button type="button" onClick={onClose} className="text-xl leading-none text-school-inkmuted hover:text-school-ink">✕</button>
        </div>

        {!isNew && isLoading ? (
          <p className="p-6 text-sm text-school-inkmuted">Chargement…</p>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 p-6">
            {error && (
              <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">{error}</p>
            )}

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Rôle *</span>
              <select
                required
                value={roleId || ''}
                onChange={(e) => setRoleId(Number(e.target.value))}
                className="school-select"
              >
                <option value="">—</option>
                {roles?.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>

            {isTeacherRole && isNew && (
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                  Enseignant — pré-remplir depuis une fiche
                </span>
                <SearchSelect
                  value={teacherId}
                  onChange={pickTeacher}
                  options={teacherOptions}
                  placeholder="Choisir un enseignant…"
                  className="mt-1"
                />
                <span className="mt-1 block text-xs text-school-inkmuted">
                  Sélectionnez un enseignant pour remplir automatiquement nom, prénom, e-mail et téléphone.
                </span>
              </label>
            )}

            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Prénom *</span>
                <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="school-input" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Nom *</span>
                <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="school-input" />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">E-mail *</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.email
                      return next
                    })
                  }
                }}
                className="school-input"
                aria-invalid={Boolean(fieldErrors.email?.[0])}
              />
              {fieldErrors.email?.[0] ? (
                <span className="mt-1 block text-xs font-semibold text-[#B23A2E]">
                  {fieldErrors.email[0]}
                </span>
              ) : null}
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Téléphone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="school-input" />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Statut</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="school-select">
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="suspended">Suspendu</option>
              </select>
            </label>

            <p className="text-xs text-school-inkmuted">
              {isNew
                ? 'Le mot de passe doit contenir au moins 8 caractères.'
                : 'Laisser vide pour ne pas changer le mot de passe (8 caractères min. sinon).'}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                  {isNew ? 'Mot de passe *' : 'Nouveau mot de passe'}
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required={isNew}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="school-input"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                  {isNew ? 'Confirmation *' : 'Confirmation'}
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required={isNew}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className="school-input"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="school-btn-secondary">Annuler</button>
              <button type="submit" disabled={save.isPending} className="school-btn-primary disabled:opacity-60">
                {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
