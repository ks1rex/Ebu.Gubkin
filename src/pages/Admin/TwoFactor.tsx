import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, ShieldOff, Check, Copy } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'

/**
 * Двухфакторная аутентификация (TOTP) для админов.
 *
 * ponytail: используется штатный MFA самого Supabase Auth (supabase.auth.mfa.*)
 * — свой TOTP, таблица секретов и генератор QR не нужны, GoTrue возвращает
 * готовый QR как SVG. Бэкенд лишь требует aal2 у админов с подтверждённым
 * фактором (см. reshbirga backend middleware/admin.js) — без этой проверки 2FA
 * была бы декоративной: Supabase выдаёт рабочую aal1-сессию по одному паролю.
 */

interface FactorRow { id: string; friendly_name?: string; status: string; created_at?: string }

const BTN = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-50'

export default function TwoFactor() {
  const toast = useToast()

  const [factors, setFactors] = useState<FactorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [aal, setAal] = useState<string | null>(null)

  // Процесс подключения
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null)
  const [code, setCode] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [{ data: f }, { data: levels }] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ])
      setFactors((f?.all ?? []) as FactorRow[])
      setAal(levels?.currentLevel ?? null)
    } catch {
      toast('Не удалось загрузить состояние 2FA', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const verified = factors.filter(f => f.status === 'verified')

  async function startEnroll() {
    setBusy(true)
    try {
      // Незавершённые попытки копятся и мешают повторному enroll с тем же
      // именем — подчищаем перед новой.
      for (const f of factors.filter(x => x.status === 'unverified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Админ ${new Date().toLocaleDateString('ru-RU')}`,
      })
      if (error || !data) throw error ?? new Error()
      setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
    } catch (e: any) {
      toast(e?.message ?? 'Не удалось начать подключение 2FA', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function confirmEnroll() {
    if (!enrolling || code.trim().length < 6) return
    setBusy(true)
    try {
      // challengeAndVerify делает challenge + verify одним вызовом и на успехе
      // сразу выдаёт aal2-сессию — отдельный шаг challenge не нужен.
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrolling.id,
        code: code.trim(),
      })
      if (error) throw error
      toast('2FA подключена', 'success')
      setEnrolling(null)
      setCode('')
      await load()
    } catch (e: any) {
      toast(e?.message ?? 'Неверный код, попробуйте снова', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function cancelEnroll() {
    if (enrolling) await supabase.auth.mfa.unenroll({ factorId: enrolling.id }).catch(() => {})
    setEnrolling(null)
    setCode('')
    load()
  }

  async function remove(factorId: string) {
    if (!confirm('Отключить 2FA? Вход снова будет только по паролю.')) return
    setBusy(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) throw error
      toast('2FA отключена', 'success')
      await load()
    } catch (e: any) {
      toast(e?.message ?? 'Не удалось отключить 2FA', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-subtle" /></div>
  }

  return (
    <div className="space-y-3">
      {verified.length > 0 ? (
        <div className="bg-surface rounded-xl border border-line p-4 space-y-3">
          <div className="flex items-center gap-2 text-success text-sm font-medium">
            <ShieldCheck size={16} />
            2FA подключена
            {aal && (
              <span className="text-xs font-normal text-subtle">
                (текущая сессия: {aal === 'aal2' ? 'подтверждена' : 'только пароль'})
              </span>
            )}
          </div>
          {verified.map(f => (
            <div key={f.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink">
                {f.friendly_name ?? 'Приложение-аутентификатор'}
                {f.created_at && (
                  <span className="text-xs text-subtle ml-2">
                    с {new Date(f.created_at).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </span>
              <button onClick={() => remove(f.id)} disabled={busy}
                className={`${BTN} border border-line text-error hover:bg-error/10`}>
                {busy ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />}
                Отключить
              </button>
            </div>
          ))}
          <p className="text-xs text-subtle">
            Пока 2FA включена, разделы админки требуют подтверждённый второй фактор —
            одного пароля недостаточно.
          </p>
        </div>
      ) : enrolling ? (
        <div className="bg-surface rounded-xl border border-line p-4 space-y-3">
          <p className="text-sm text-ink">
            1. Отсканируйте QR-код в приложении-аутентификаторе (Google Authenticator,
            Aegis, 1Password, Яндекс Ключ).
          </p>
          <div className="bg-white rounded-lg p-3 inline-block">
            <img src={enrolling.qr} alt="QR-код для 2FA" className="block w-40 h-40" />
          </div>
          <div className="text-xs text-subtle">
            Не сканируется? Введите ключ вручную:
            <button
              onClick={() => { navigator.clipboard?.writeText(enrolling.secret); toast('Ключ скопирован', 'success') }}
              className="ml-1.5 inline-flex items-center gap-1 font-mono text-ink hover:text-accent transition-colors break-all"
            >
              {enrolling.secret}
              <Copy size={11} className="shrink-0" />
            </button>
          </div>
          <p className="text-sm text-ink">2. Введите код из приложения:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && confirmEnroll()}
              placeholder="000000"
              className="w-28 border border-line rounded-lg px-3 py-1.5 text-sm text-ink bg-canvas tracking-widest text-center focus:outline-none focus:border-accent"
            />
            <button onClick={confirmEnroll} disabled={busy || code.length < 6}
              className={`${BTN} bg-accent text-white hover:bg-accent-hover`}>
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Подтвердить
            </button>
            <button onClick={cancelEnroll} disabled={busy}
              className={`${BTN} border border-line text-ink hover:bg-panel`}>
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-line p-4 space-y-3">
          <div className="flex items-center gap-2 text-subtle text-sm">
            <ShieldOff size={16} />
            Вход только по email и паролю
          </div>
          <button onClick={startEnroll} disabled={busy}
            className={`${BTN} bg-accent text-white hover:bg-accent-hover`}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
            Подключить 2FA
          </button>
          <p className="text-xs text-subtle">
            Код из приложения-аутентификатора будет спрашиваться при каждом входе.
            Включается для каждого администратора отдельно — остальные не потеряют доступ.
          </p>
        </div>
      )}
    </div>
  )
}
