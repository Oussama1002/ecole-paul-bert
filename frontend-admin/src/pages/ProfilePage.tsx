import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as authApi from '../api/auth'
import { useAuth } from '../contexts/AuthContext'

export function ProfilePage() {
  const { user, refreshMe } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [address, setAddress] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    setFirstName(user.first_name ?? '')
    setLastName(user.last_name ?? '')
    setEmail(user.email ?? '')
    setUsername(user.username ?? '')
    setPhone(user.phone ?? '')
    setGender(user.gender ?? '')
    setDateOfBirth(user.date_of_birth ?? '')
    setAddress(user.address ?? '')
  }, [user])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        username: username.trim() || null,
        phone: phone.trim() || null,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        address: address.trim() || null,
      })
      await refreshMe()
      setMessage('Profil mis à jour.')
    } catch (e) {
      setError((e as Error).message || 'Impossible de mettre à jour le profil.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-semibold text-slate-800">Mon profil</h2>
        <Link to="/mot-de-passe" className="text-sm font-semibold text-indigo-600 hover:underline">
          Changer le mot de passe
        </Link>
      </div>
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2"
      >
        {message && (
          <p className="md:col-span-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p className="md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Field label="Prénom">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
        <Field label="Nom">
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
        <Field label="E-mail">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
        <Field label="Identifiant">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
        <Field label="Téléphone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
        <Field label="Genre">
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">—</option>
            <option value="male">Masculin</option>
            <option value="female">Feminin</option>
            <option value="other">Autre</option>
          </select>
        </Field>
        <Field label="Date de naissance">
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
        <Field label="Adresse">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-600">{label}</span>
      {children}
    </label>
  )
}
