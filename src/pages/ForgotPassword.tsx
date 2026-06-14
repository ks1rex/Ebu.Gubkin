import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'

const INPUT = 'w-full px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
    })
    setLoading(false)
    if (error) {
      setError('Не удалось отправить письмо. Проверьте email.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="bg-surface border border-line rounded-xl p-8">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-subtle text-sm hover:text-ink mb-6 transition-colors">
            <ArrowLeft size={14} />
            Назад ко входу
          </Link>

          <h1 className="text-xl font-semibold text-ink mb-2">Восстановление пароля</h1>
          <p className="text-sm text-subtle mb-6">Введите email — мы пришлём ссылку для сброса пароля</p>

          {sent ? (
            <div className="bg-success/10 border border-success/30 rounded-lg px-4 py-3 flex items-start gap-3">
              <Mail size={18} className="text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-ink">Письмо отправлено</p>
                <p className="text-xs text-subtle mt-0.5">Проверьте ящик <strong>{email}</strong> и перейдите по ссылке из письма</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="student@gubkin.ru"
                  className={INPUT}
                />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors text-sm"
              >
                {loading ? 'Отправляем...' : 'Отправить ссылку'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
