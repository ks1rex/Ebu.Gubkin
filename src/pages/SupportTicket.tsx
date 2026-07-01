import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ChatWindow from '../components/ChatWindow'

const API = import.meta.env.VITE_BACKEND_URL as string

const STATUS_META: Record<string, { label: string; cls: string }> = {
  open:     { label: 'Открыт',   cls: 'bg-accent-subtle text-accent' },
  answered: { label: 'Ответили', cls: 'bg-success/10 text-success'  },
  closed:   { label: 'Закрыт',   cls: 'bg-panel text-subtle'        },
}

interface Ticket {
  id: string
  subject: string
  status: 'open' | 'answered' | 'closed'
  created_at: string
  conversation_id: string | null
}

export default function SupportTicket() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()

  const [ticket,  setTicket]  = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!id || !session) return
    fetch(`${API}/support/tickets/${id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setTicket)
      .catch(() => setError('Тикет не найден'))
      .finally(() => setLoading(false))
  }, [id, session])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="animate-spin text-subtle" size={24} />
    </div>
  )

  if (error || !ticket) return (
    <div className="max-w-2xl mx-auto py-8 text-center text-subtle text-sm">{error || 'Тикет не найден'}</div>
  )

  const s = STATUS_META[ticket.status] ?? STATUS_META.open
  const isClosed = ticket.status === 'closed'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/support"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', marginBottom: 8 }}>
          <ArrowLeft size={14} /> Все тикеты
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.1rem' }}>{ticket.subject}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
        </div>
      </div>

      {ticket.conversation_id ? (
        <ChatWindow conversationId={ticket.conversation_id} readOnly={isClosed} />
      ) : (
        <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', paddingTop: 32 }}>
          Чат ещё не создан
        </div>
      )}
    </div>
  )
}
