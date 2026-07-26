import { useState, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const logoV = `${import.meta.env.BASE_URL}logo-horizontal-trimmed.png`

const FIELD = `w-full px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm placeholder:text-subtle
               focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors`
const SUBMIT = `w-full py-2 px-4 bg-accent text-white font-medium rounded-lg
                hover:bg-accent-hover disabled:opacity-50 transition-colors text-sm`

export default function Login() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  // Второй шаг: у аккаунта подключён TOTP-фактор. Пароль уже принят (сессия
  // aal1), но до aal2 админка недоступна — см. Admin/TwoFactor.tsx.
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setLoading(false)
      setError('Неверный email или пароль')
      return
    }

    // Пароль подошёл — проверяем, требуется ли второй фактор.
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totp = (factors?.totp ?? []).find(f => f.status === 'verified')
    setLoading(false)
    if (totp) {
      setMfaFactorId(totp.id)
      return
    }
    navigate(from, { replace: true })
  }

  async function handleMfa(e: FormEvent) {
    e.preventDefault()
    if (!mfaFactorId || code.length < 6) return
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code })
    setLoading(false)
    if (error) {
      setCode('')
      setError('Неверный код. Проверьте время на устройстве и попробуйте снова.')
      return
    }
    navigate(from, { replace: true })
  }

  if (mfaFactorId) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <img src={logoV} alt="Ebu.Gubkin" className="h-[120px] w-auto" />
          </div>
          <div className="bg-surface border border-line rounded-xl p-8">
            <h1 className="text-xl font-semibold text-ink mb-2">Подтверждение входа</h1>
            <p className="text-sm text-subtle mb-6">
              Введите код из приложения-аутентификатора
            </p>
            <form onSubmit={handleMfa} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className={`${FIELD} text-center tracking-[0.4em] text-lg`}
              />
              {error && <p className="text-sm text-error">{error}</p>}
              <button type="submit" disabled={loading || code.length < 6} className={SUBMIT}>
                {loading ? 'Проверяем...' : 'Подтвердить'}
              </button>
            </form>
            <button
              onClick={async () => { await supabase.auth.signOut(); setMfaFactorId(null); setError('') }}
              className="mt-4 w-full text-center text-sm text-subtle hover:text-ink transition-colors"
            >
              Войти другим аккаунтом
            </button>
          </div>
        </div>
      </div>
    )
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

          <p className="mt-4 text-center text-sm text-subtle">
            <Link to="/forgot-password" className="text-subtle hover:text-ink transition-colors">
              Забыли пароль?
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-subtle">
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
