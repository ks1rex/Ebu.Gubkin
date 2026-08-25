import { useEffect, useState, FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { apiCall } from '../lib/api'
import { timeAgo } from '../lib/timeAgo'
import { GlassCard, Avatar, Stars } from '../components/glass'
import StarRating from '../components/StarRating'

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  user: { id: string; nickname: string | null; avatar_url: string | null }
}

interface Teacher {
  id: string
  full_name: string
  department: string | null
  position: string | null
  photo_url: string | null
  avg_rating: number | null
  reviews_count: number
  reviews: Review[]
  my_review: Review | null
}

export default function TeacherDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await apiCall('GET', `/teachers/${id}`)
      setTeacher(data)
      if (data.my_review) {
        setRating(data.my_review.rating)
        setComment(data.my_review.comment ?? '')
      }
    } catch {
      toast('Не удалось загрузить преподавателя', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!rating) { toast('Поставьте оценку', 'error'); return }
    setSubmitting(true)
    try {
      await apiCall('POST', `/teachers/${id}/reviews`, { rating, comment: comment.trim() || undefined })
      toast('Отзыв сохранён', 'success')
      load()
    } catch {
      toast('Ошибка при отправке отзыва', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await apiCall('DELETE', `/teachers/${id}/reviews`)
      setRating(0)
      setComment('')
      toast('Отзыв удалён', 'success')
      load()
    } catch {
      toast('Не удалось удалить отзыв', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
  if (!teacher) return null

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/teachers" className="inline-flex items-center gap-1.5 text-subtle text-sm mb-4 hover:text-ink transition-colors">
        <ArrowLeft size={14} /> Ко всем преподавателям
      </Link>

      <GlassCard className="rounded-2xl p-6 flex items-center gap-4 mb-6">
        <Avatar name={teacher.full_name} src={teacher.photo_url} size={64} radius={16} />
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-ink truncate">{teacher.full_name}</h1>
          <div className="text-sm text-subtle truncate">
            {[teacher.position, teacher.department].filter(Boolean).join(' · ') || '—'}
          </div>
          {teacher.reviews_count > 0 ? (
            <div className="flex items-center gap-2 mt-1.5">
              <Stars rating={teacher.avg_rating ?? 0} />
              <span className="text-xs text-subtle">{teacher.avg_rating} · {teacher.reviews_count} отзывов</span>
            </div>
          ) : (
            <span className="text-xs text-subtle mt-1.5 block">Пока нет отзывов</span>
          )}
        </div>
      </GlassCard>

      {user && (
        <GlassCard className="rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-ink mb-3">{teacher.my_review ? 'Ваш отзыв' : 'Оставить отзыв'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <StarRating value={rating} onChange={setRating} size={24} gap={4} />
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Комментарий (необязательно)..."
              rows={3}
              maxLength={3000}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:border-accent resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting || !rating}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-accent-subtle text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {teacher.my_review ? 'Сохранить' : 'Отправить'}
              </button>
              {teacher.my_review && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-subtle border border-line rounded-lg hover:bg-white/[.06] transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Удалить
                </button>
              )}
            </div>
          </form>
        </GlassCard>
      )}

      <h2 className="text-sm font-semibold text-ink mb-3">Отзывы</h2>
      {teacher.reviews.length === 0 ? (
        <GlassCard className="rounded-2xl py-10 text-center text-subtle text-sm">Отзывов пока нет</GlassCard>
      ) : (
        <div className="flex flex-col gap-3">
          {teacher.reviews.map(r => (
            <GlassCard key={r.id} className="rounded-2xl p-4">
              <div className="flex items-center gap-2.5 mb-1.5">
                <Avatar name={r.user.nickname} src={r.user.avatar_url} size={28} radius={9} className="text-xs" />
                <span className="text-sm text-ink font-medium">{r.user.nickname}</span>
                <StarRating value={r.rating} size={13} gap={1} />
                <span className="text-xs text-subtle ml-auto">{timeAgo(r.created_at)}</span>
              </div>
              {r.comment && <p className="text-sm text-subtle leading-relaxed whitespace-pre-wrap">{r.comment}</p>}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
