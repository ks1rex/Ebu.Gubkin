import { Outlet, Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function GostLayout() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', textDecoration: 'none', fontSize: '0.85rem' }}>
          <Home size={14} /> Главная
        </Link>
        <span style={{ color: '#2d3f55' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>ГОСТ-калькулятор</span>
      </div>
      <Outlet />
    </div>
  )
}
