import { useEffect, useState } from 'react'
import { Send, Check, Loader2 } from 'lucide-react'
import { apiCall } from '../lib/api'
import { useToast } from '../contexts/ToastContext'

/** Привязка личного Telegram-бота — дублирует туда сайтовые уведомления. */
export default function TelegramLink() {
  const toast = useToast()
  const [linked, setLinked] = useState<boolean | null>(null)
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function fetchStatus() {
    try {
      const { linked } = await apiCall('GET', '/telegram/status')
      setLinked(linked)
      if (linked) setDeepLink(null)
    } catch { /* тихо — не критично для остального профиля */ }
  }

  useEffect(() => { fetchStatus() }, [])

  // Пока ссылка показана и ещё не привязано — проверяем каждые 3с: после
  // нажатия Start в Telegram привязка происходит на бэкенде без участия
  // этой вкладки, статус меняется асинхронно.
  useEffect(() => {
    if (!deepLink || linked) return
    const t = setInterval(fetchStatus, 3000)
    return () => clearInterval(t)
  }, [deepLink, linked])

  async function connect() {
    setLoading(true)
    try {
      const { deep_link } = await apiCall('POST', '/telegram/link')
      setDeepLink(deep_link)
      window.open(deep_link, '_blank', 'noopener')
    } catch (e: any) {
      toast(e?.data?.error ?? 'Не удалось создать ссылку', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function disconnect() {
    setLoading(true)
    try {
      await apiCall('DELETE', '/telegram/link')
      setLinked(false)
      setDeepLink(null)
    } catch {
      toast('Не удалось отвязать', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (linked === null) return null

  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1">Дублировать уведомления в Telegram</label>
      {linked ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-success bg-success/10 rounded-lg px-2.5 py-1.5">
            <Check size={13} /> Подключено
          </span>
          <button
            type="button"
            onClick={disconnect}
            disabled={loading}
            className="text-xs text-subtle hover:text-error transition-colors disabled:opacity-50"
          >
            Отключить
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={connect}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-ink bg-white/[.1] border border-white/[.16] rounded-xl hover:bg-white/[.16] transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Подключить Telegram
          </button>
          {deepLink && (
            <p className="text-xs text-subtle mt-1.5">
              Откроется бот — нажмите «Start». Если не открылось само,{' '}
              <a href={deepLink} target="_blank" rel="noopener" className="text-accent hover:underline">откройте ссылку вручную</a>.
              Ссылка действует 15 минут.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
