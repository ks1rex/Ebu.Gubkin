import { useState, useEffect, FormEvent } from 'react'
import Modal from '../Modal'
import { useToast } from '../../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_BACKEND_URL as string

interface Category { id: string; name: string }

interface Props {
  token: string
  prefillCategoryId?: string
  prefillCategoryName?: string
  onClose: () => void
}

export default function CreateThreadModal({ token, prefillCategoryId, prefillCategoryName, onClose }: Props) {
  const showToast = useToast()
  const navigate  = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState(prefillCategoryId ?? '')
  const [title,    setTitle]    = useState('')
  const [content,  setContent]  = useState('')
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (prefillCategoryId) return
    fetch(`${API}/forum/categories`)
      .then(r => r.json())
      .then(data => setCategories(data ?? []))
      .catch(() => {})
  }, [prefillCategoryId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!categoryId || !title.trim() || !content.trim()) return
    setLoading(true)
    try {
      const res  = await fetch(`${API}/forum/threads`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ category_id: categoryId, title: title.trim(), content: content.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Ошибка при создании темы', 'error'); return }
      showToast('Тема создана!', 'success')
      onClose()
      navigate(`/forum/thread/${data.thread_id}`)
    } catch {
      showToast('Не удалось создать тему', 'error')
    } finally {
      setLoading(false)
    }
  }

  const INPUT = 'w-full px-3 py-2 rounded-lg border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors'

  return (
    <Modal open={true} onClose={onClose} title="Новая тема">
      <form onSubmit={handleSubmit} className="space-y-3">
        {prefillCategoryId ? (
          <p className="text-sm text-subtle">Категория: <span className="text-ink font-medium">{prefillCategoryName}</span></p>
        ) : (
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={INPUT} required>
            <option value="">Выберите категорию…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Заголовок темы"
          maxLength={200}
          required
          className={INPUT}
        />

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Текст первого сообщения…"
          rows={5}
          maxLength={10000}
          required
          className={`${INPUT} resize-none`}
        />

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-1.5 text-sm border border-line rounded-md text-ink hover:bg-panel transition-colors">
            Отмена
          </button>
          <button type="submit" disabled={loading || !categoryId || !title.trim() || !content.trim()}
            className="px-4 py-1.5 text-sm bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50">
            {loading ? 'Создание…' : 'Создать тему'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
