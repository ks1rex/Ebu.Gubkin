import { useEffect, useState, FormEvent } from 'react'
import { Loader2, GraduationCap, Trash2 } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { apiCall } from '../../lib/api'

interface Teacher {
  id: string
  full_name: string
  department: string | null
  position: string | null
  photo_url: string | null
  reviews_count: number
}

export default function AdminTeachers() {
  const toast = useToast()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [posting, setPosting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await apiCall('GET', '/teachers')
      setTeachers(Array.isArray(data) ? data : [])
    } catch {
      toast('Не удалось загрузить список', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { toast('Введите ФИО', 'error'); return }
    setPosting(true)
    try {
      await apiCall('POST', '/teachers', {
        full_name: fullName.trim(),
        department: department.trim() || undefined,
        position: position.trim() || undefined,
        photo_url: photoUrl.trim() || undefined,
      })
      setFullName(''); setDepartment(''); setPosition(''); setPhotoUrl('')
      toast('Преподаватель добавлен', 'success')
      load()
    } catch {
      toast('Ошибка добавления', 'error')
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await apiCall('DELETE', `/teachers/${id}`)
      setTeachers(teachers.filter(t => t.id !== id))
    } catch {
      toast('Не удалось удалить', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink flex items-center gap-2"><GraduationCap size={20} /> Преподаватели</h1>

      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-line p-5 space-y-3">
        <input
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="ФИО"
          className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={position}
            onChange={e => setPosition(e.target.value)}
            placeholder="Должность"
            className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
          />
          <input
            value={department}
            onChange={e => setDepartment(e.target.value)}
            placeholder="Кафедра"
            className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
          />
        </div>
        <input
          value={photoUrl}
          onChange={e => setPhotoUrl(e.target.value)}
          placeholder="Ссылка на фото (необязательно)"
          className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={posting}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-accent-subtle text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
        >
          {posting && <Loader2 size={14} className="animate-spin" />}
          Добавить
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-subtle" /></div>
      ) : teachers.length === 0 ? (
        <div className="text-center text-subtle text-sm py-8">Список пока пуст</div>
      ) : (
        <div className="space-y-2">
          {teachers.map(t => (
            <div key={t.id} className="bg-surface rounded-xl border border-line p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium text-ink truncate">{t.full_name}</div>
                <div className="text-xs text-subtle mt-0.5 truncate">
                  {[t.position, t.department].filter(Boolean).join(' · ') || '—'} · {t.reviews_count} отзывов
                </div>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
                disabled={deletingId === t.id}
                title="Удалить"
                className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-subtle hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
              >
                {deletingId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
