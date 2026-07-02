import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

const API = import.meta.env.VITE_BACKEND_URL as string

type Status = 'idle' | 'running' | 'waiting_captcha' | 'done' | 'error'

interface WarmupState {
  status: Status
  captcha_image_base64: string | null
  progress_step: string | null
  progress_current: number
  progress_total: number
  last_run_at: string | null
  last_error: string | null
}

export default function AdminScheduleWarmup() {
  const { session } = useAuth()
  const toast = useToast()
  const token = session?.access_token

  const [state, setState] = useState<WarmupState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchStatus() {
    try {
      const res = await fetch(`${API}/admin/schedule-warmup/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data: WarmupState = await res.json()
      setState(data)
      return data
    } catch {
      toast('Не удалось загрузить статус прогрева', 'error')
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  useEffect(() => {
    const shouldPoll = state?.status === 'running' || state?.status === 'waiting_captcha'
    if (shouldPoll && !pollRef.current) {
      pollRef.current = setInterval(fetchStatus, 2500)
    } else if (!shouldPoll && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [state?.status])

  async function start() {
    setBusy(true)
    try {
      const res = await fetch(`${API}/admin/schedule-warmup/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      await fetchStatus()
    } catch {
      toast('Не удалось запустить прогрев', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    setBusy(true)
    try {
      const res = await fetch(`${API}/admin/schedule-warmup/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      await fetchStatus()
    } catch {
      toast('Не удалось отменить прогрев', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function submitCaptcha() {
    if (!answer.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`${API}/admin/schedule-warmup/solve-captcha`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer: answer.trim() }),
      })
      if (!res.ok) throw new Error()
      const data: { success: boolean } = await res.json()
      setAnswer('')
      if (data.success) {
        toast('Капча принята, прогрев продолжается', 'success')
      } else {
        toast('Неверная капча, попробуйте снова', 'error')
      }
      await fetchStatus()
    } catch {
      toast('Ошибка при отправке капчи', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading || !state) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
  }

  const pct = state.progress_total > 0
    ? Math.min(100, Math.round((state.progress_current / state.progress_total) * 100))
    : 0

  return (
    <div className="space-y-4 max-w-xl">
      {state.status === 'idle' && (
        <div className="bg-surface border border-line rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-semibold text-ink">Прогрев расписания</h1>
          <p className="text-sm text-subtle">
            Последний успешный прогрев: {state.last_run_at ? new Date(state.last_run_at).toLocaleString('ru-RU') : 'никогда'}
          </p>
          <button
            onClick={start}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Начать прогрев
          </button>
        </div>
      )}

      {state.status === 'running' && (
        <div className="bg-surface border border-line rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-semibold text-ink">Прогрев выполняется...</h1>
          <div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div
                className="bg-accent h-3 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-subtle mt-1.5">
              {state.progress_current} / {state.progress_total} ({pct}%)
            </p>
          </div>
          {state.progress_step && (
            <p className="text-sm text-subtle">{state.progress_step}</p>
          )}
          <button
            onClick={cancel}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-error text-error font-medium rounded-lg hover:bg-error/10 transition-colors disabled:opacity-40"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Отменить
          </button>
        </div>
      )}

      {state.status === 'waiting_captcha' && (
        <div className="bg-surface border border-line rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-semibold text-ink">Требуется капча</h1>
          {state.captcha_image_base64 && (
            <div className="bg-white rounded-lg p-3 inline-block">
              <img src={state.captcha_image_base64} alt="Captcha" className="block" />
            </div>
          )}
          <input
            type="text"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitCaptcha() }}
            placeholder="Введите код с картинки"
            className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
          />
          <button
            onClick={submitCaptcha}
            disabled={busy || !answer.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Подтвердить
          </button>
        </div>
      )}

      {state.status === 'done' && (
        <div className="bg-surface border border-line rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-semibold text-ink">Прогрев завершён ✅</h1>
          <p className="text-sm text-subtle">
            Завершён: {state.last_run_at ? new Date(state.last_run_at).toLocaleString('ru-RU') : '—'}
          </p>
          <button
            onClick={start}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Запустить снова
          </button>
        </div>
      )}

      {state.status === 'error' && (
        <div className="bg-surface border border-line rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-semibold text-ink">Ошибка прогрева ❌</h1>
          <p className="text-sm text-error">{state.last_error ?? 'Неизвестная ошибка'}</p>
          <button
            onClick={start}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Попробовать снова
          </button>
        </div>
      )}
    </div>
  )
}
