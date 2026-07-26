import { useEffect, useRef, useState } from 'react'
import { Loader2, RotateCcw, Check } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { apiCall } from '../../lib/api'

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

const CARD = 'bg-surface border border-line rounded-xl p-6 space-y-4'
const BTN_PRIMARY = 'w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40'
const BTN_GHOST   = 'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-line text-ink font-medium rounded-lg hover:bg-panel transition-colors disabled:opacity-40'

export default function AdminScheduleWarmup() {
  const toast = useToast()

  const [state, setState] = useState<WarmupState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState('')
  const [autoHours, setAutoHours] = useState('')
  const [savingAuto, setSavingAuto] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchStatus() {
    try {
      const data: WarmupState = await apiCall('GET', '/admin/schedule-warmup/status')
      setState(data)
      return data
    } catch {
      toast('Не удалось загрузить статус прогрева', 'error')
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    apiCall('GET', '/admin/settings')
      .then((d: { admin?: Record<string, string> }) => setAutoHours(d.admin?.warmup_auto_hours ?? '0'))
      .catch(() => setAutoHours('0'))
  }, [])

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

  // force=false — прогрев продолжается с места остановки: всё, что уже лежит
  // в кэше расписаний и не истекло, не запрашивается заново.
  async function start(force = false) {
    setBusy(true)
    try {
      await apiCall('POST', '/admin/schedule-warmup/start', { force })
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
      await apiCall('POST', '/admin/schedule-warmup/cancel')
      await fetchStatus()
    } catch {
      toast('Не удалось отменить прогрев', 'error')
    } finally {
      setBusy(false)
    }
  }

  // «Отмена» ставит флаг в процессе бэкенда; если процесс перезапустили
  // (деплой, падение), статус в базе навсегда остаётся «выполняется» и запуск
  // блокируется. Сброс чинит именно это, не теряя прогретый кэш.
  async function reset() {
    setBusy(true)
    try {
      await apiCall('POST', '/admin/schedule-warmup/reset')
      toast('Статус сброшен', 'success')
      await fetchStatus()
    } catch {
      toast('Не удалось сбросить статус', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function submitCaptcha() {
    if (!answer.trim()) return
    setBusy(true)
    try {
      const data: { success: boolean } = await apiCall('POST', '/admin/schedule-warmup/solve-captcha', { answer: answer.trim() })
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

  async function saveAutoHours() {
    setSavingAuto(true)
    try {
      await apiCall('PUT', '/admin/admin-settings/warmup_auto_hours', { value: autoHours || '0' })
      toast(Number(autoHours) > 0 ? 'Автопрогрев включён' : 'Автопрогрев выключен', 'success')
    } catch (e: any) {
      toast(e?.data?.error ?? 'Ошибка при сохранении', 'error')
    } finally {
      setSavingAuto(false)
    }
  }

  if (loading || !state) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
  }

  const pct = state.progress_total > 0
    ? Math.min(100, Math.round((state.progress_current / state.progress_total) * 100))
    : 0

  const lastRun = state.last_run_at ? new Date(state.last_run_at).toLocaleString('ru-RU') : 'никогда'
  const canReset = state.status === 'running' || state.status === 'waiting_captcha'

  return (
    <div className="space-y-4 max-w-xl">
      {state.status === 'idle' && (
        <div className={CARD}>
          <h1 className="text-xl font-semibold text-ink">Прогрев расписания</h1>
          <p className="text-sm text-subtle">Последний успешный прогрев: {lastRun}</p>
          <button onClick={() => start(false)} disabled={busy} className={BTN_PRIMARY}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            Продолжить прогрев
          </button>
          <button onClick={() => start(true)} disabled={busy} className={BTN_GHOST}>
            Прогреть заново (игнорировать кэш)
          </button>
          <p className="text-xs text-subtle">
            «Продолжить» пропускает всё, что уже лежит в кэше и не истекло — после
            обрыва прогрев не начинается с нуля.
          </p>
        </div>
      )}

      {state.status === 'running' && (
        <div className={CARD}>
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
        <div className={CARD}>
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
          <button onClick={submitCaptcha} disabled={busy || !answer.trim()} className={BTN_PRIMARY.replace('py-3', 'py-2.5')}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            Подтвердить
          </button>
        </div>
      )}

      {state.status === 'done' && (
        <div className={CARD}>
          <h1 className="text-xl font-semibold text-ink">Прогрев завершён ✅</h1>
          <p className="text-sm text-subtle">Завершён: {lastRun}</p>
          {state.progress_step && <p className="text-sm text-subtle">{state.progress_step}</p>}
          <button onClick={() => start(false)} disabled={busy} className={BTN_PRIMARY}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            Запустить снова
          </button>
          <button onClick={() => start(true)} disabled={busy} className={BTN_GHOST}>
            Прогреть заново (игнорировать кэш)
          </button>
        </div>
      )}

      {state.status === 'error' && (
        <div className={CARD}>
          <h1 className="text-xl font-semibold text-ink">Ошибка прогрева ❌</h1>
          <p className="text-sm text-error">{state.last_error ?? 'Неизвестная ошибка'}</p>
          <button onClick={() => start(false)} disabled={busy} className={BTN_PRIMARY}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            Продолжить с места остановки
          </button>
        </div>
      )}

      {canReset && (
        <div className="bg-surface border border-line rounded-xl p-4 space-y-2">
          <p className="text-xs text-subtle">
            Если прогрев висит в этом статусе и прогресс не двигается (например, сервер
            перезапустился посреди прогона) — сбросьте статус. Прогретый кэш сохранится,
            следующий запуск продолжит с места остановки.
          </p>
          <button
            onClick={reset}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-line rounded-lg hover:bg-panel text-ink transition-colors disabled:opacity-40"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            Сбросить статус
          </button>
        </div>
      )}

      {/* Автоматическое расписание */}
      <div className="bg-surface border border-line rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-ink">Автоматический прогрев</h2>
        <p className="text-xs text-subtle">
          Запускать прогрев автоматически, если с последнего успешного прошло больше
          указанного числа часов. 0 — выключено. Полностью без человека прогрев не
          проходит: первый шаг — капча, поэтому автозапуск доводит прогон до капчи и
          присылает уведомление в Telegram. Тот же сторож раз в 15 минут сбрасывает
          статус «выполняется», если прогресс перестал двигаться.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={autoHours}
            onChange={e => setAutoHours(e.target.value)}
            className="w-24 border border-line rounded-lg px-3 py-1.5 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
          />
          <span className="text-sm text-subtle">часов</span>
          <button
            onClick={saveAutoHours}
            disabled={savingAuto}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {savingAuto ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
