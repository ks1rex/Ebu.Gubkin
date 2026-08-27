import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, GraduationCap } from 'lucide-react'
import { apiCall } from '../lib/api'
import { GlassCard, Avatar, Stars } from '../components/glass'

interface Teacher {
  id: string
  full_name: string
  position: string | null
  photo_url: string | null
  avg_rating: number | null
  reviews_count: number
}

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    apiCall('GET', '/teachers')
      .then(data => setTeachers(Array.isArray(data) ? data : []))
      .catch(() => setTeachers([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = teachers.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-2 flex items-center gap-2">
        <GraduationCap size={20} className="text-lav" /> Преподаватели
      </h1>
      <p className="text-sm text-subtle mb-5">Оценивай преподавателей и читай отзывы других студентов</p>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Поиск по имени..."
        className="w-full mb-5 px-4 py-2.5 rounded-[14px] border border-line bg-canvas text-ink text-sm placeholder:text-subtle focus:outline-none focus:border-accent"
      />

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
      ) : filtered.length === 0 ? (
        <GlassCard className="rounded-2xl py-16 text-center text-subtle text-sm">
          {teachers.length === 0 ? 'Список преподавателей пока пуст' : 'Ничего не найдено'}
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(t => (
            <Link key={t.id} to={`/teachers/${t.id}`}>
              <GlassCard hover className="rounded-2xl px-5 py-4 flex items-center gap-3">
                <Avatar name={t.full_name} src={t.photo_url} size={44} radius={12} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{t.full_name}</div>
                  <div className="text-xs text-subtle mt-0.5 truncate">
                    {t.position || '—'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {t.reviews_count > 0 ? (
                    <>
                      <Stars rating={t.avg_rating ?? 0} />
                      <div className="text-[11px] text-subtle/70 mt-0.5">{t.reviews_count} отзывов</div>
                    </>
                  ) : (
                    <span className="text-[11px] text-subtle/70">без отзывов</span>
                  )}
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
