import { useEffect, useState, FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

/**
 * Одна точка проверки второго фактора на всю админку. Бэкенд отдаёт 403
 * MFA_REQUIRED на каждый /admin/* запрос из aal1-сессии (см. reshbirga
 * middleware/admin.js), поэтому дожидаться этой ошибки на каждой странице
 * отдельно смысла нет — гейт стоит здесь, до рендера любого раздела.
 * Актуально для уже сохранённой сессии: после логина шаг кода проходит Login.
 */
function MfaGate({ factorId, onDone }: { factorId: string; onDone: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (code.length < 6) return
    setBusy(true)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    setBusy(false)
    if (error) { setCode(''); setError('Неверный код, попробуйте снова'); return }
    onDone()
  }

  return (
    <div className="flex items-center justify-center py-24 px-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-ink font-semibold">
          <ShieldCheck size={18} className="text-accent" />
          Подтвердите вход в админку
        </div>
        <p className="text-sm text-subtle">Введите код из приложения-аутентификатора</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full px-3 py-2 rounded-lg border border-line bg-panel text-ink text-lg text-center tracking-[0.4em] focus:outline-none focus:border-accent"
          />
          {error && <p className="text-sm text-error">{error}</p>}
          <button
            type="submit"
            disabled={busy || code.length < 6}
            className="w-full py-2 px-4 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors text-sm"
          >
            {busy ? 'Проверяем...' : 'Подтвердить'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  // null = ещё проверяем, '' = второй фактор не требуется
  const [needFactorId, setNeedFactorId] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  async function checkAal() {
    try {
      const [{ data: factors }, { data: levels }] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ])
      const totp = (factors?.totp ?? []).find(f => f.status === 'verified')
      setNeedFactorId(totp && levels?.currentLevel !== 'aal2' ? totp.id : null)
    } catch {
      setNeedFactorId(null) // не смогли проверить — пусть решает бэкенд
    } finally {
      setChecked(true)
    }
  }

  useEffect(() => {
    if (!loading && profile?.is_admin) checkAal()
    else if (!loading) setChecked(true)
  }, [loading, profile?.is_admin])

  if (loading || !checked) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="animate-spin text-subtle" />
    </div>
  )
  if (!profile?.is_admin) return <Navigate to="/" replace />
  if (needFactorId) return <MfaGate factorId={needFactorId} onDone={() => setNeedFactorId(null)} />
  return <>{children}</>
}
