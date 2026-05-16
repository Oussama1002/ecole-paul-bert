import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import * as authApi from '../api/auth'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setDone(true)
    } catch {
      setError("Impossible d'envoyer la demande pour le moment.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="school-page-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-school-lg border border-school-border/80 bg-school-paper p-8 shadow-school-lg sm:p-10">
        <div className="mb-4 text-center text-4xl" aria-hidden>
          ✉️
        </div>
        <h1 className="mb-4 text-center font-display text-2xl font-extrabold text-school-ink">
          Mot de passe oublié
        </h1>
        {done ? (
          <p className="text-center text-sm font-medium text-school-inkmuted">
            Si cette adresse est enregistrée, un message vous a été envoyé (vérifiez
            aussi les logs en environnement de développement).
          </p>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)}>
            {error && (
              <p className="mb-3 rounded-xl border-2 border-school-coral/40 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                {error}
              </p>
            )}
            <label className="mb-4 block">
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
            <button
              type="submit"
              disabled={loading}
              className="school-btn-primary w-full py-3 disabled:opacity-60"
            >
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-sm font-medium">
          <Link
            to="/login"
            className="text-school-skydeep underline-offset-4 hover:underline"
          >
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
