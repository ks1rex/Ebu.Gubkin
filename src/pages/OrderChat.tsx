import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { apiCall } from '../lib/api'
import ChatWindow from '../components/ChatWindow'
import Spinner from '../components/Spinner'

export default function OrderChat() {
  const { id: orderId } = useParams<{ id: string }>()

  const [order, setOrder] = useState<any>(null)
  const [convId, setConvId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const rootRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      apiCall('GET', `/orders/${orderId}`),
      apiCall('GET', `/orders/${orderId}/conversation`),
    ]).then(([ord, conv]) => {
      setOrder(ord)
      setConvId(conv.conversation_id)
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [orderId])

  // Высота чата — прямым замером в пикселях, а не через каскад CSS
  // flex/проценты (Layout → MarketLayout → OrderChat → ChatWindow):
  // корневой контейнер страницы задаёт только min-height, а не height,
  // так что "процент от родителя"/flex-1 на промежуточных уровнях не
  // резолвится в определённую высоту и чат схлопывается до размера
  // контента вместо того, чтобы дотянуться до футера снизу.
  useEffect(() => {
    function recalc() {
      const el = rootRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const footer = document.querySelector('footer')
      const footerH = footer?.getBoundingClientRect().height ?? 0
      const vh = window.visualViewport?.height ?? window.innerHeight
      setHeight(Math.max(320, vh - top - footerH))
    }
    recalc()
    window.addEventListener('resize', recalc)
    window.visualViewport?.addEventListener('resize', recalc)
    return () => {
      window.removeEventListener('resize', recalc)
      window.visualViewport?.removeEventListener('resize', recalc)
    }
  }, [order?.title, loading])

  if (loading) return <Spinner />
  if (error) return <div style={{ color: '#f87171' }}>{error}</div>
  if (!convId) return <div style={{ color: '#f87171' }}>Чат для этого заказа ещё не создан</div>

  const orderClosed = order?.status === 'completed' || order?.status === 'cancelled'

  return (
    <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', height: height ?? '70vh', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Link to={`/market/orders/${orderId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', textDecoration: 'none', fontSize: '0.85rem' }}>
          <ArrowLeft size={14} /> К заказу
        </Link>
        <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.1rem' }}>
          Чат по заказу «{order?.title}»
        </div>
      </div>

      <ChatWindow
        conversationId={convId}
        readOnly={orderClosed}
      />
    </div>
  )
}
