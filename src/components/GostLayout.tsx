import { Outlet, Link, useLocation } from 'react-router-dom'
import { Home, PlusCircle, FileText } from 'lucide-react'

const TABS = [
  { to: '/gost',        label: 'Создать проект', icon: PlusCircle, exact: true },
  { to: '/gost/format', label: 'Форматирование',  icon: FileText,   exact: false },
]

export default function GostLayout() {
  const { pathname } = useLocation()

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', textDecoration: 'none', fontSize: '0.85rem' }}>
          <Home size={14} /> Главная
        </Link>
        <span style={{ color: '#2d3f55' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>ГОСТ-калькулятор</span>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #1e3a4a' }}>
        {TABS.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? (pathname === to || pathname === to + '/') : pathname.startsWith(to)
          return (
            <Link key={to} to={to} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', textDecoration: 'none',
              fontSize: '0.88rem', fontWeight: active ? 600 : 400,
              color: active ? '#14a89a' : '#94a3b8',
              borderBottom: `2px solid ${active ? '#14a89a' : 'transparent'}`,
              marginBottom: -1,
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}>
              <Icon size={14} />{label}
            </Link>
          )
        })}
      </div>

      <Outlet />
    </div>
  )
}
