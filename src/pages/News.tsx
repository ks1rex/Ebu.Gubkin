import { useEffect, useState } from 'react'
import { Loader2, Newspaper } from 'lucide-react'
import { apiCall } from '../lib/api'
import { GlassCard } from '../components/glass'

interface NewsItem {
  id: string
  title: string
  content: string
}

export default function News() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiCall('GET', '/news')
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-5 flex items-center gap-2">
        <Newspaper size={20} className="text-lav" /> Новости
      </h1>

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
      ) : items.length === 0 ? (
        <GlassCard className="rounded-2xl py-16 text-center text-subtle text-sm">Новостей пока нет</GlassCard>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map(item => (
            <GlassCard key={item.id} className="rounded-2xl p-5">
              <h2 className="font-semibold text-ink mb-2">{item.title}</h2>
              <p className="text-sm text-subtle leading-relaxed whitespace-pre-wrap">{item.content}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
