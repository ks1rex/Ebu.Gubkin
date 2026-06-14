import { useState, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const logoV = `${import.meta.env.BASE_URL}logo-vertical.png`

export default function Login() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('Неверный email или пароль')
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src={logoV} alt="Ebu.Gubkin" className="h-[120px] w-auto" />
        </div>

        <div className="bg-surface border border-line rounded-xl p-8">
          <h1 className="text-xl font-semibold text-ink mb-6">Вход</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="student@gubkin.ru"
                className="w-full px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm placeholder:text-subtle
                           focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Пароль</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm placeholder:text-subtle
                           focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-accent text-white font-medium rounded-lg
                         hover:bg-accent-hover disabled:opacity-50 transition-colors text-sm"
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-subtle">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-accent-muted hover:text-accent transition-colors font-medium">
              Регистрация
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
