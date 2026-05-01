import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as authApi from '../api/auth'

export function ResetPasswordPage() {
  const [search] = useSearchParams()
  const token = useMemo(() => search.get('token') ?? '', [search])
  const emailParam = useMemo(() => search.get('email') ?? '', [search])

  const [email, setEmail] = useState(emailParam)

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [emailParam])
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError('Lien invalide (jeton manquant).')
      return
    }
    if (password !== passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      })
      setDone(true)
    } catch (e) {
      setError((e as Error).message || 'Réinitialisation impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="school-page-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-school-lg border border-school-border/80 bg-school-paper p-8 shadow-school-lg sm:p-10">
        <div className="mb-4 text-center text-4xl" aria-hidden>
          🔑
        </div>
        <h1 className="mb-4 text-center font-display text-2xl font-extrabold text-school-ink">
          Nouveau mot de passe
        </h1>
        {done ? (
          <p className="text-center text-sm font-medium text-school-inkmuted">
            Votre mot de passe a été mis à jour.{' '}
            <Link
              to="/login"
              className="font-semibold text-school-skydeep underline-offset-4 hover:underline"
            >
              Se connecter
            </Link>
          </p>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)}>
            {error && (
              <p className="mb-3 rounded-xl border-2 border-school-coral/40 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                {error}
              </p>
            )}
            <label className="mb-3 block">
              <span className="mb-1.5 block text-sm font-semibold text-school-ink">
                E-mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="school-input"
              />
            </label>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-sm font-semibold text-school-ink">
                Nouveau mot de passe
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="school-input"
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-semibold text-school-ink">
                Confirmation
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="school-input"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="school-btn-primary w-full py-3 disabled:opacity-60"
            >
              {loading ? 'Validation…' : 'Réinitialiser'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
