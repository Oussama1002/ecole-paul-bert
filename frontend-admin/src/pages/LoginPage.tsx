import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { SchoolLoginIllustration } from '../components/brand/SchoolLoginIllustration'
import { useAuth } from '../contexts/AuthContext'
import { isTeacherRole } from '../utils/roles'

export function LoginPage() {
  const { user, ready, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from
    ?.pathname

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (ready && user) {
    const home = isTeacherRole(user.role?.code)
      ? '/emploi-du-temps'
      : (from ?? '/')
    return <Navigate to={home} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const session = await login(email, password)
      const home = isTeacherRole(session.user.role?.code)
        ? '/emploi-du-temps'
        : (from ?? '/')
      navigate(home, { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Connexion impossible. Vérifiez vos identifiants.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="school-page-bg flex min-h-screen">
      <div className="relative hidden w-1/2 lg:block">
        <div className="absolute inset-0 bg-school-login" />
        <SchoolLoginIllustration />
      </div>

      <div className="flex w-full flex-col justify-center px-4 py-10 sm:px-8 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-school-sky to-school-leaf text-2xl shadow-school">
              🎓
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold text-school-ink">
                Paul Bert
              </p>
              <p className="text-sm font-medium text-school-inkmuted">
                Connexion équipe
              </p>
            </div>
          </div>

          <div className="rounded-school-lg border border-school-border/80 bg-school-paper p-8 shadow-school-lg sm:p-10">
            <h1 className="mb-2 font-display text-2xl font-extrabold text-school-ink sm:text-3xl">
              Bonjour ! 👋
            </h1>
            <p className="mb-8 text-sm font-medium text-school-inkmuted">
              Entrez vos identifiants pour accéder à l&apos;espace administration.
            </p>

            {error && (
              <p className="mb-5 rounded-xl border-2 border-school-coral/40 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {error}
              </p>
            )}

            <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-school-ink">
                  E-mail ou identifiant
                </span>
                <input
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="school-input"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-school-ink">
                  Mot de passe
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="school-input"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="school-btn-primary w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Connexion…' : "Entrer dans l'espace école"}
              </button>
            </form>

            <p className="mt-8 text-center text-sm font-medium">
              <Link
                to="/mot-de-passe-oublie"
                className="text-school-skydeep underline-offset-4 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs font-medium text-school-inkmuted">
            Un environnement pensé pour la scolarité des enfants et le travail des
            équipes.
          </p>
        </div>
      </div>
    </div>
  )
}
