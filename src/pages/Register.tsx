import { useState, FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, Gift } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const logoV = `${import.meta.env.BASE_URL}logo-horizontal-trimmed.png`

export default function Register() {
  const { signUp } = useAuth()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')

  const [email,    setEmail]    = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  // Две отметки, а не одна: согласие на обработку персональных данных должно
  // даваться отдельным действием и не может быть объединено с принятием
  // соглашения и оферты. Обе обязательны для отправки формы.
  const [acceptTerms,   setAcceptTerms]   = useState(false)
  const [acceptPdn,     setAcceptPdn]     = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Пароли не совпадают')
      return
    }
    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }
    if (!acceptTerms || !acceptPdn) {
      setError('Отметьте оба согласия — без них регистрация невозможна')
      return
    }
    setLoading(true)
    const { error } = await signUp(email, password, nickname, refCode)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center max-w-sm bg-surface border border-line rounded-xl p-10">
          <CheckCircle size={40} className="text-success mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-ink mb-2">Почти готово!</h2>
          <p className="text-subtle text-sm mb-6">
            Мы отправили письмо на <strong className="text-ink">{email}</strong>.
            Подтвердите почту и войдите в аккаунт.
          </p>
          <Link
            to="/login"
            className="inline-block px-5 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
          >
            Перейти ко входу
          </Link>
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
          <h1 className="text-xl font-semibold text-ink mb-6">Регистрация</h1>

          {refCode && (
            <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg bg-accent-subtle border border-accent/20 text-accent-muted text-sm">
              <Gift size={15} className="shrink-0" />
              <span>Вы регистрируетесь по приглашению — бонусы будут начислены пригласившему</span>
            </div>
          )}

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
              <label className="block text-sm font-medium text-ink mb-1">Никнейм</label>
              <input
                type="text"
                required
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="student_gubkin"
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
                placeholder="Минимум 6 символов"
                className="w-full px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm placeholder:text-subtle
                           focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Повторите пароль</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm placeholder:text-subtle
                           focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                  className="w-[18px] h-[18px] mt-px shrink-0 accent-accent cursor-pointer"
                />
                <span className="text-[13px] text-subtle leading-snug">
                  Я согласен с{' '}
                  <Link to="/terms" target="_blank" className="text-accent-muted hover:text-accent underline underline-offset-2">
                    Пользовательским соглашением
                  </Link>{' '}
                  и{' '}
                  <Link to="/offer" target="_blank" className="text-accent-muted hover:text-accent underline underline-offset-2">
                    Публичной офертой
                  </Link>
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptPdn}
                  onChange={e => setAcceptPdn(e.target.checked)}
                  className="w-[18px] h-[18px] mt-px shrink-0 accent-accent cursor-pointer"
                />
                <span className="text-[13px] text-subtle leading-snug">
                  Я даю{' '}
                  <Link to="/pdn-consent" target="_blank" className="text-accent-muted hover:text-accent underline underline-offset-2">
                    согласие на обработку персональных данных
                  </Link>{' '}
                  на условиях{' '}
                  <Link to="/privacy" target="_blank" className="text-accent-muted hover:text-accent underline underline-offset-2">
                    Политики конфиденциальности
                  </Link>
                </span>
              </label>
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <button
              type="submit"
              disabled={loading || !acceptTerms || !acceptPdn}
              className="w-full py-2 px-4 bg-accent text-white font-medium rounded-lg
                         hover:bg-accent-hover disabled:opacity-50 transition-colors text-sm"
            >
              {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-subtle">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-accent-muted hover:text-accent transition-colors font-medium">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
