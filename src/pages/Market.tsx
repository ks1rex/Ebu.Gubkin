import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Search, Briefcase, ClipboardList, Star, BookOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiCall } from '../lib/api'

const S: Record<string, any> = {
  heading: { color: '#e2e8f0', fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 },
  sub: { color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  card: { background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 12, padding: '1.5rem', textDecoration: 'none', display: 'block' },
  cardTitle: { display: 'flex', alignItems: 'center', gap: 8, color: '#14a89a', fontWeight: 600, marginBottom: 8 },
  cardText: { color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 },
  pendingBlock: { background: '#0f1923', border: '1px solid #f59e0b44', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' },
}

const NAV_CARDS = [
  { icon: Search,        title: 'Биржа заказов',    text: 'Открытые заказы от студентов — откликайтесь и предлагайте цену', to: '/market/orders' },
  { icon: BookOpen,      title: 'Каталог услуг',    text: 'Готовые предложения исполнителей — выберите и закажите сразу', to: '/market/services' },
  { icon: PlusCircle,    title: 'Создать заказ',    text: 'Разместите задание — репетитор, курсовая, реферат и другое', to: '/market/orders/new' },
  { icon: Briefcase,     title: 'Разместить услугу', text: 'Предложите свою помощь другим студентам и зарабатывайте', to: '/market/services/new' },
  { icon: ClipboardList, title: 'Мои заказы',       text: 'Отслеживайте статусы заказов и переписку с исполнителями', to: '/market/orders/mine' },
  { icon: Search,        title: 'Мои отклики',      text: 'Заказы, на которые вы откликнулись, и активные работы', to: '/market/orders/applied' },
]

export default function Market() {
  const { user } = useAuth()
  const [pendingReviews, setPendingReviews] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    apiCall('GET', '/orders/pending-reviews')
      .then(data => setPendingReviews(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [user])

  return (
    <div>
      <div style={S.heading}>Студенческая биржа</div>
      <div style={S.sub}>Заказывайте учебную помощь или предлагайте свои услуги другим студентам</div>

      {pendingReviews.length > 0 && (
        <div style={S.pendingBlock}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontWeight: 600, marginBottom: '0.75rem' }}>
            <Star size={16} fill="#f59e0b" style={{ color: '#f59e0b' }} />
            Ожидают вашего отзыва
          </div>
          {pendingReviews.map((o: any) => (
            <Link key={o.id} to={`/market/orders/${o.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e3a4a', textDecoration: 'none', color: 'inherit' }}>
              <div>
                <div style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 500 }}>{o.title}</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 2 }}>{o.subject} · {o.role === 'customer' ? 'Вы заказчик' : 'Вы исполнитель'}</div>
              </div>
              <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>Оставить отзыв →</span>
            </Link>
          ))}
        </div>
      )}

      <div style={S.grid}>
        {NAV_CARDS.map(({ icon: Icon, title, text, to }) => (
          <Link key={to} to={to} style={S.card}>
            <div style={S.cardTitle}><Icon size={18} />{title}</div>
            <div style={S.cardText}>{text}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
