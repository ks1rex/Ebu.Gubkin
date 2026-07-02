import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LogOut, Menu, X, ShieldCheck, Wallet as WalletIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Avatar } from './glass'
import { useGostFrozenModal } from './GostFrozenNotice'

const logoMark = `${import.meta.env.BASE_URL}logo-mark.png`

const NAV_ITEMS_PUBLIC = [
  { label: 'Форум',            to: '/forum'  },
  { label: 'Биржа',            to: '/market' },
  { label: 'Расписание',       to: '/schedule' },
  { label: 'ГОСТ-калькулятор', to: '/gost', frozen: true },
]

const NAV_ITEMS_AUTH = [
  ...NAV_ITEMS_PUBLIC,
  { label: 'Кошелёк',   to: '/wallet'  },
  { label: 'Поддержка', to: '/support' },
]

export default function Navbar() {
  const { user, profile, signOut, isVip } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const { openGostFrozenModal, gostFrozenModal } = useGostFrozenModal()

  function close() { setMenuOpen(false) }

  const items = user ? NAV_ITEMS_AUTH : NAV_ITEMS_PUBLIC

  return (
    <header className="sticky top-0 z-50 mx-3.5 sm:mx-6 mt-5 mb-2 px-4 sm:px-5 py-3.5 rounded-[20px] bg-surface border border-line backdrop-blur-glass shadow-[0_18px_50px_rgba(20,8,50,.45),inset_0_1px_0_rgba(255,255,255,.18)] flex items-center gap-6">
      {/* Логотип */}
      <Link to="/" onClick={close} className="flex items-center gap-3 shrink-0">
        <img src={logoMark} alt="Ebu.Gubkin" className="w-12 h-12 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,.4)]" />
        <div className="leading-none">
          <span className="font-bold text-[21px] tracking-[-.5px] text-ink">
            Ebu<span className="bg-gradient-to-r from-mint to-lav bg-clip-text text-transparent font-bold">.Gubkin</span>
          </span>
          <span className="block text-[10px] tracking-[2px] text-subtle font-normal mt-1">ДЛЯ СТУДЕНТОВ</span>
        </div>
      </Link>

      {/* Навигация (desktop) */}
      <nav className="hidden md:flex items-center gap-1 flex-1 ml-1.5">
        {items.map(({ label, to, frozen }) => (
          frozen && !profile?.is_admin ? (
            <button
              key={to}
              type="button"
              onClick={openGostFrozenModal}
              className="text-[14.5px] font-medium px-4 py-2.5 rounded-xl whitespace-nowrap text-subtle/50 opacity-50 cursor-default"
            >
              {label}
            </button>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-[14.5px] font-medium px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors duration-150 ${
                  isActive
                    ? 'text-ink bg-white/[.12] shadow-[inset_0_1px_0_rgba(255,255,255,.2)] font-semibold'
                    : 'text-subtle hover:text-ink hover:bg-white/[.06]'
                }`
              }
            >
              {label}
            </NavLink>
          )
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2.5 shrink-0">
        {user && (
          <>
            {/* Пилюля кошелька */}
            <Link
              to="/wallet"
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-[14px] font-semibold text-sm text-[#08221c] bg-gradient-to-br from-mint to-[#a7f3d0] shadow-[0_6px_18px_rgba(94,234,212,.3)] whitespace-nowrap"
            >
              <WalletIcon size={14} />
              {(profile?.balance ?? 0).toLocaleString('ru-RU')} ₽
            </Link>

            {profile?.is_admin && (
              <Link
                to="/admin"
                title="Панель администратора"
                className="hidden sm:flex items-center justify-center w-10 h-10 rounded-[14px] text-subtle hover:text-ink hover:bg-white/[.06] transition-colors"
              >
                <ShieldCheck size={17} />
              </Link>
            )}

            <Link to="/profile" onClick={close}>
              <Avatar name={profile?.nickname ?? profile?.full_name ?? 'Я'} src={profile?.avatar_url} size={42} radius={14} isVip={isVip} />
            </Link>

            <button
              onClick={signOut}
              title="Выйти"
              className="hidden sm:flex items-center justify-center w-10 h-10 rounded-[14px] text-subtle hover:text-ink hover:bg-white/[.06] transition-colors"
            >
              <LogOut size={16} />
            </button>
          </>
        )}

        {!user && (
          <>
            <Link
              to="/login"
              className="hidden sm:inline-flex px-4 py-2.5 text-sm font-medium text-ink border border-white/[.16] rounded-[13px] hover:bg-white/[.08] transition-colors"
            >
              Войти
            </Link>
            <Link
              to="/register"
              className="px-4 py-2.5 text-sm font-semibold text-[#1a1140] bg-gradient-to-br from-white to-[#e9e4ff] rounded-[13px] shadow-[0_10px_26px_rgba(0,0,0,.28)]"
            >
              Регистрация
            </Link>
          </>
        )}

        {/* Burger (mobile only) */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-[14px] text-subtle hover:text-ink hover:bg-white/[.06] transition-colors"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Меню"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 mt-2 p-3 rounded-[20px] bg-[#241551]/95 border border-line backdrop-blur-glass shadow-[0_18px_50px_rgba(20,8,50,.6)]">
          <nav className="flex flex-col gap-1">
            {items.map(({ label, to, frozen }) => (
              frozen && !profile?.is_admin ? (
                <button
                  key={to}
                  type="button"
                  onClick={() => { close(); openGostFrozenModal() }}
                  className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-subtle/50 opacity-50 cursor-default text-left"
                >
                  {label}
                </button>
              ) : (
                <NavLink
                  key={to}
                  to={to}
                  onClick={close}
                  className={({ isActive }) =>
                    `px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'text-ink bg-white/[.12]' : 'text-subtle hover:text-ink hover:bg-white/[.06]'
                    }`
                  }
                >
                  {label}
                </NavLink>
              )
            ))}
            {user && profile?.is_admin && (
              <NavLink
                to="/admin"
                onClick={close}
                className={({ isActive }) =>
                  `px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                    isActive ? 'text-ink bg-white/[.12]' : 'text-subtle hover:text-ink hover:bg-white/[.06]'
                  }`
                }
              >
                <ShieldCheck size={15} />
                Админка
              </NavLink>
            )}
            {user && (
              <button
                onClick={() => { close(); signOut() }}
                className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-subtle hover:text-ink hover:bg-white/[.06] transition-colors text-left flex items-center gap-2"
              >
                <LogOut size={15} /> Выйти
              </button>
            )}
            {!user && (
              <Link
                to="/login"
                onClick={close}
                className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-subtle hover:text-ink hover:bg-white/[.06] transition-colors"
              >
                Войти
              </Link>
            )}
          </nav>
        </div>
      )}
      {gostFrozenModal}
    </header>
  )
}
