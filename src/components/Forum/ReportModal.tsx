import { useState, FormEvent } from 'react'
import Modal from '../Modal'
import { useToast } from '../../contexts/ToastContext'

const API = import.meta.env.VITE_BACKEND_URL as string

interface Props {
  postId: string
  onClose: () => void
  token: string
}

export default function ReportModal({ postId, onClose, token }: Props) {
  const showToast = useToast()
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!reason.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/forum/report`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ post_id: postId, reason: reason.trim() }),
      })
      if (!res.ok) throw new Error()
      showToast('Жалоба отправлена', 'success')
      onClose()
    } catch {
      showToast('Не удалось отправить жалобу', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="Пожаловаться на пост">
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Опишите причину жалобы..."
          rows={4}
          maxLength={500}
          className="w-full px-3 py-2 rounded-lg border border-line bg-canvas text-ink text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-1.5 text-sm border border-line rounded-md text-ink hover:bg-panel transition-colors">
            Отмена
          </button>
          <button type="submit" disabled={!reason.trim() || loading}
            className="px-4 py-1.5 text-sm bg-error text-white rounded-md hover:bg-error/90 transition-colors disabled:opacity-50">
            {loading ? 'Отправка…' : 'Пожаловаться'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
