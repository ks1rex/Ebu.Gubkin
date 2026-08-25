import { useEffect, useState, FormEvent } from 'react'
import { Loader2, Newspaper, Trash2 } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'
import { apiCall } from '../../lib/api'

interface NewsItem {
  id: string
  title: string
  content: string
  created_at: string
  author?: { nickname: string | null } | null
}

export default function AdminNews() {
  const toast = useToast()
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await apiCall('GET', '/news')
      setItems(Array.isArray(data) ? data : [])
    } catch {
      toast('Не удалось загрузить новости', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) { toast('Заполните заголовок и текст', 'error'); return }
    setPosting(true)
    try {
      await apiCall('POST', '/news', { title: title.trim(), content: content.trim() })
      setTitle('')
      setContent('')
      toast('Новость опубликована', 'success')
      load()
    } catch {
      toast('Ошибка публикации', 'error')
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await apiCall('DELETE', `/news/${id}`)
      setItems(items.filter(i => i.id !== id))
    } catch {
      toast('Не удалось удалить', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink flex items-center gap-2"><Newspaper size={20} /> Новости</h1>

      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-line p-5 space-y-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Заголовок"
          maxLength={200}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Текст новости..."
          rows={4}
          maxLength={20000}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:border-accent resize-none"
        />
        <button
          type="submit"
          disabled={posting}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-accent-subtle text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
        >
          {posting && <Loader2 size={14} className="animate-spin" />}
          Опубликовать
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-subtle" /></div>
      ) : items.length === 0 ? (
        <div className="text-center text-subtle text-sm py-8">Новостей пока нет</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-surface rounded-xl border border-line p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink">{item.title}</h3>
                  <div className="text-xs text-subtle mt-0.5">
                    {item.author?.nickname ?? 'Админ'} · {timeAgo(item.created_at)}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  title="Удалить"
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-subtle hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                >
                  {deletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
              <p className="text-sm text-subtle leading-relaxed mt-2 whitespace-pre-wrap">{item.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
