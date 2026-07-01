import { Outlet, Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Search, BookOpen, PlusCircle, Briefcase, ClipboardList, Inbox } from 'lucide-react'

const TABS = [
  { to: '/market/orders',   label: 'Заказы',    icon: Search },
  { to: '/market/services', label: 'Услуги',    icon: BookOpen },
  { to: '/market/orders/new',    label: 'Новый заказ',  icon: PlusCircle },
  { to: '/market/services/new',  label: 'Новая услуга', icon: Briefcase },
  { to: '/market/orders/mine',   label: 'Мои заказы',   icon: ClipboardList },
  { to: '/market/orders/applied',label: 'Мои отклики',  icon: Inbox },
]

export default function MarketLayout() {
  const { pathname } = useLocation()

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <Link
          to="/market"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', flexShrink: 0 }}
        >
          <ArrowLeft size={14} /> Биржа
        </Link>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {TABS.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== '/market/orders' && to !== '/market/services' && pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 500,
                  textDecoration: 'none',
                  background: active ? '#14a89a22' : 'transparent',
                  color: active ? '#14a89a' : '#64748b',
                  border: `1px solid ${active ? '#14a89a55' : 'transparent'}`,
                }}
              >
                <Icon size={13} />
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      <Outlet />
    </div>
  )
}
