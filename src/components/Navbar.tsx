import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { User, LogOut, Menu, X, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const logoH = `${import.meta.env.BASE_URL}logo-horizontal-trimmed.png`

const NAV_ITEMS = [
  { label: 'Форум',            to: '/forum'  },
  { label: 'Биржа',            to: '/market' },
  { label: 'ГОСТ-калькулятор', to: '/gost'   },
  { label: 'Кошелёк',          to: '/wallet' },
]

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  function close() { setMenuOpen(false) }

  return (
    <header className="sticky top-0 z-50 bg-brand-orange">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-20 gap-6">

        {/* Логотип */}
        <Link to="/" onClick={close} className="shrink-0">
          <img src={logoH} alt="Ebu.Gubkin" className="h-16 w-auto object-contain" style={{ minWidth: '200px' }} />
        </Link>

        {/* Навигация (desktop) */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {NAV_ITEMS.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/15'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Правая часть */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {user ? (
            <>
              {profile?.is_admin && (
                <Link
                  to="/admin"
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/15 transition-colors"
                  title="Панель администратора"
                >
                  <ShieldCheck size={15} />
                  <span>Админ</span>
                </Link>
              )}

              <Link
                to="/profile"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-white/15 transition-colors"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <User size={14} className="text-white" />
                  </div>
                )}
                <span className="text-sm font-medium text-white hidden sm:block">
                  {profile?.nickname ?? profile?.full_name ?? 'Профиль'}
                </span>
              </Link>

              <button
                onClick={signOut}
                title="Выйти"
                className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/15 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex px-4 py-1.5 text-sm font-medium text-white border border-white/30 rounded-md hover:bg-white/15 transition-colors"
              >
                Войти
              </Link>
              <Link
                to="/register"
                className="px-4 py-1.5 text-sm font-medium text-brand-orange bg-white rounded-md hover:bg-white/90 transition-colors"
              >
                Регистрация
              </Link>
            </>
          )}

          {/* Burger (mobile only) */}
          <button
            className="md:hidden p-2 rounded-md text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Меню"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/20 bg-brand-orange">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                onClick={close}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:text-white hover:bg-white/15'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            {!user && (
              <Link
                to="/login"
                onClick={close}
                className="px-3 py-2 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              >
                Войти
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
