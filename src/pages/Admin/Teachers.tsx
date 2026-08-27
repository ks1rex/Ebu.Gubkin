import { useEffect, useState, FormEvent } from 'react'
import { Loader2, GraduationCap, Trash2, Pencil, X } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { apiCall } from '../../lib/api'

interface Teacher {
  id: string
  full_name: string
  position: string | null
  photo_url: string | null
  reviews_count: number
}

const INPUT = 'w-full border border-line rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:border-accent'

export default function AdminTeachers() {
  const toast = useToast()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [posting, setPosting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editPosition, setEditPosition] = useState('')
  const [editPhotoUrl, setEditPhotoUrl] = useState('')
  const [saving, setSaving] = useState(false)

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
        position: position.trim() || undefined,
        photo_url: photoUrl.trim() || undefined,
      })
      setFullName(''); setPosition(''); setPhotoUrl('')
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

  function startEdit(t: Teacher) {
    setEditingId(t.id)
    setEditFullName(t.full_name)
    setEditPosition(t.position ?? '')
    setEditPhotoUrl(t.photo_url ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingId || !editFullName.trim()) { toast('Введите ФИО', 'error'); return }
    setSaving(true)
    try {
      const updated = await apiCall('PATCH', `/teachers/${editingId}`, {
        full_name: editFullName.trim(),
        position: editPosition.trim() || null,
        photo_url: editPhotoUrl.trim() || null,
      })
      setTeachers(teachers.map(t => t.id === editingId ? { ...t, ...updated } : t))
      setEditingId(null)
      toast('Изменения сохранены', 'success')
    } catch {
      toast('Не удалось сохранить', 'error')
    } finally {
      setSaving(false)
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
          className={INPUT}
        />
        <input
          value={position}
          onChange={e => setPosition(e.target.value)}
          placeholder="Должность"
          className={INPUT}
        />
        <input
          value={photoUrl}
          onChange={e => setPhotoUrl(e.target.value)}
          placeholder="Ссылка на фото (необязательно)"
          className={INPUT}
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
            editingId === t.id ? (
              <form key={t.id} onSubmit={saveEdit} className="bg-surface rounded-xl border border-accent/40 p-4 space-y-3">
                <input
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  placeholder="ФИО"
                  className={INPUT}
                />
                <input
                  value={editPosition}
                  onChange={e => setEditPosition(e.target.value)}
                  placeholder="Должность"
                  className={INPUT}
                />
                <input
                  value={editPhotoUrl}
                  onChange={e => setEditPhotoUrl(e.target.value)}
                  placeholder="Ссылка на фото (необязательно)"
                  className={INPUT}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-accent-subtle text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-subtle hover:text-ink transition-colors disabled:opacity-50"
                  >
                    <X size={14} /> Отмена
                  </button>
                </div>
              </form>
            ) : (
              <div key={t.id} className="bg-surface rounded-xl border border-line p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-ink truncate">{t.full_name}</div>
                  <div className="text-xs text-subtle mt-0.5 truncate">
                    {t.position || '—'} · {t.reviews_count} отзывов
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    onClick={() => startEdit(t)}
                    title="Редактировать"
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-subtle hover:text-accent hover:bg-accent/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    title="Удалить"
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-subtle hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                  >
                    {deletingId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}
