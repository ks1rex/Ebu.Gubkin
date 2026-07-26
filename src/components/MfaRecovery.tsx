import { useState, FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { apiCall } from '../lib/api'

/**
 * Вход по резервному коду при потерянном аутентификаторе.
 *
 * Код не выдаёт aal2-сессию — GoTrue отдаёт её только за настоящий TOTP.
 * Поэтому код *снимает* фактор (POST /mfa/recover), после чего пароля
 * достаточно, а 2FA нужно подключить заново. Используется в двух местах:
 * на шаге кода при логине (pages/Login.tsx) и в гейте админки
 * (components/AdminRoute.tsx).
 */
export default function MfaRecovery({
  onRecovered,
  onCancel,
  fieldClass,
  submitClass,
}: {
  onRecovered: () => void
  onCancel: () => void
  fieldClass: string
  submitClass: string
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const value = code.trim()
    if (value.length < 4) return
    setBusy(true)
    setError('')
    try {
      await apiCall('POST', '/mfa/recover', { code: value })
      onRecovered()
    } catch (err: any) {
      setError(err?.data?.error ?? 'Не удалось снять 2FA по этому коду')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-ink font-medium">
        <KeyRound size={15} className="text-accent" />
        Вход по резервному коду
      </div>
      <p className="text-xs text-subtle">
        Введите один из кодов, сохранённых при подключении 2FA. Код одноразовый:
        он снимет двухфакторную аутентификацию, дальше её нужно подключить заново
        в «Настройках → Безопасность».
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="text"
          autoComplete="off"
          autoFocus
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().slice(0, 24))}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className={`${fieldClass} font-mono text-center tracking-widest`}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        <button type="submit" disabled={busy || code.trim().length < 4} className={submitClass}>
          {busy ? 'Проверяем...' : 'Снять 2FA и войти'}
        </button>
      </form>
      <button
        onClick={onCancel}
        className="w-full text-center text-sm text-subtle hover:text-ink transition-colors"
      >
        Назад к коду из приложения
      </button>
    </div>
  )
}
