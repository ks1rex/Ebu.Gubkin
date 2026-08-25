import { useState, useEffect, FormEvent } from 'react'
import { ImagePlus, Paperclip, X } from 'lucide-react'
import Modal from '../Modal'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import { uploadForumFile } from '../../lib/forumMedia'
import { useForumAttachments } from '../../lib/useForumAttachments'
import AttachmentList from './AttachmentList'
import ImageCropper from '../ImageCropper'

const API = import.meta.env.VITE_BACKEND_URL as string

interface Category { id: string; name: string }

interface Props {
  token: string
  prefillCategoryId?: string
  prefillCategoryName?: string
  onClose: () => void
}

export default function CreateThreadModal({ token, prefillCategoryId, prefillCategoryName, onClose }: Props) {
  const { user }   = useAuth()
  const showToast = useToast()
  const navigate  = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState(prefillCategoryId ?? '')
  const [title,    setTitle]    = useState('')
  const [content,  setContent]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [coverUrl, setCoverUrl] = useState('')
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverToCrop, setCoverToCrop] = useState<File | null>(null)
  const { attachments, uploading, handleFiles, removeAttachment } = useForumAttachments()

  function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked || !user) return
    setCoverToCrop(picked)
  }

  async function uploadCover(cropped: File) {
    setCoverToCrop(null)
    if (!user) return
    setCoverUploading(true)
    const uploaded = await uploadForumFile(cropped, user.id)
    if (uploaded) setCoverUrl(uploaded.url)
    else showToast('Не удалось загрузить обложку', 'error')
    setCoverUploading(false)
  }

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
        body:    JSON.stringify({
          category_id: categoryId, title: title.trim(), content: content.trim(),
          cover_url: coverUrl || undefined, attachments,
        }),
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

        <div>
          {coverUrl ? (
            <div className="relative w-fit">
              <img src={coverUrl} alt="Обложка темы" className="w-[160px] h-[90px] object-cover rounded-lg border border-line" />
              <button type="button" onClick={() => setCoverUrl('')}
                className="absolute -top-1.5 -right-1.5 w-[20px] h-[20px] rounded-full bg-canvas border border-line text-subtle flex items-center justify-center">
                <X size={11} />
              </button>
            </div>
          ) : (
            <label className="inline-flex items-center gap-1.5 text-sm text-subtle border border-line rounded-md px-3 py-1.5 cursor-pointer hover:text-ink">
              <ImagePlus size={14} /> {coverUploading ? 'Загрузка…' : 'Обложка темы (необязательно)'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleCover} disabled={coverUploading} />
            </label>
          )}
        </div>

        <div>
          <label className="inline-flex items-center gap-1.5 text-sm text-subtle border border-line rounded-md px-3 py-1.5 cursor-pointer hover:text-ink">
            <Paperclip size={14} /> {uploading ? 'Загрузка…' : 'Прикрепить фото/файлы'}
            <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx" className="hidden" onChange={handleFiles} disabled={uploading} />
          </label>
          <AttachmentList attachments={attachments} onRemove={removeAttachment} />
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-1.5 text-sm border border-line rounded-md text-ink hover:bg-panel transition-colors">
            Отмена
          </button>
          <button type="submit" disabled={loading || uploading || coverUploading || !categoryId || !title.trim() || !content.trim()}
            className="px-4 py-1.5 text-sm bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50">
            {loading ? 'Создание…' : 'Создать тему'}
          </button>
        </div>
      </form>
      {coverToCrop && (
        <ImageCropper file={coverToCrop} aspect={16 / 9} onCancel={() => setCoverToCrop(null)} onConfirm={uploadCover} />
      )}
    </Modal>
  )
}
