import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom'
import * as usersApi from '../api/users'
import * as rolesApi from '../api/roles'
import { getApiErrorMessage, getApiFieldErrors } from '../utils/apiError'

export function UserFormPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isNew = !!matchPath('/utilisateurs/nouveau', pathname)
  const editMatch = matchPath('/utilisateurs/:id/editer', pathname)
  const numericId = editMatch?.params?.id
    ? parseInt(editMatch.params.id, 10)
    : Number.NaN
  const queryClient = useQueryClient()

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.fetchRoles,
  })

  const { data: existing, isLoading } = useQuery({
    queryKey: ['user', numericId],
    queryFn: () => usersApi.fetchUser(numericId),
    enabled: !isNew && !Number.isNaN(numericId),
  })

  const [roleId, setRoleId] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('active')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!existing) {
      return
    }
    setRoleId(existing.role?.id ?? 0)
    setFirstName(existing.first_name)
    setLastName(existing.last_name)
    setEmail(existing.email)
    setUsername(existing.username ?? '')
    setPhone(existing.phone ?? '')
    setStatus(existing.status)
    setPassword('')
    setPasswordConfirmation('')
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      if (isNew) {
        const payload: usersApi.CreateUserPayload = {
          role_id: roleId,
          first_name: firstName,
          last_name: lastName,
          email: email.trim(),
          phone: phone || null,
          password,
          password_confirmation: passwordConfirmation,
          status,
        }
        if (username.trim()) {
          payload.username = username.trim()
        }
        return usersApi.createUser(payload)
      }
      const payload: usersApi.UpdateUserPayload = {
        role_id: roleId,
        first_name: firstName,
        last_name: lastName,
        email,
        username: username || null,
        phone: phone || null,
        status,
      }
      if (password) {
        payload.password = password
        payload.password_confirmation = passwordConfirmation
      }
      return usersApi.updateUser(numericId, payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate('/utilisateurs')
    },
    onError: (e: unknown) => {
      setFieldErrors(getApiFieldErrors(e))
      setError(getApiErrorMessage(e, 'Erreur lors de l’enregistrement.'))
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

  if (!isNew && Number.isNaN(numericId)) {
    return <p className="text-red-600">Utilisateur invalide.</p>
  }

  if (!isNew && isLoading) {
    return <p className="text-slate-600">Chargement…</p>
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/utilisateurs"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Retour à la liste
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-slate-800">
          {isNew ? 'Nouvel utilisateur' : "Modifier l'utilisateur"}
        </h2>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="max-w-lg space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">Rôle *</span>
          <select
            required
            value={roleId || ''}
            onChange={(e) => setRoleId(Number(e.target.value))}
            className="w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">—</option>
            {roles?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="mb-1 block text-sm text-slate-600">Prénom *</span>
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm text-slate-600">Nom *</span>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">E-mail *</span>
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
            className="w-full rounded border border-slate-300 px-3 py-2"
            aria-invalid={Boolean(fieldErrors.email?.[0])}
          />
          {fieldErrors.email?.[0] ? (
            <span className="mt-1 block text-sm text-red-600">
              {fieldErrors.email[0]}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">Identifiant</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">Téléphone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">Statut</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
            <option value="suspended">Suspendu</option>
          </select>
        </label>

        {isNew ? (
          <>
            <label className="block">
              <span className="mb-1 block text-sm text-slate-600">
                Mot de passe *
              </span>
              <input
                type="password"
                autoComplete="new-password"
                required={isNew}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-slate-600">
                Confirmation *
              </span>
              <input
                type="password"
                autoComplete="new-password"
                required={isNew}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              Laisser vide pour ne pas changer le mot de passe.
            </p>
            <label className="block">
              <span className="mb-1 block text-sm text-slate-600">
                Nouveau mot de passe
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-slate-600">
                Confirmation
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <Link
            to="/utilisateurs"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
