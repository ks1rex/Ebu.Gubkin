import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LogOut, Menu, X, ShieldCheck, Wallet as WalletIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Avatar } from './glass'
import { useGostFrozenModal } from './GostFrozenNotice'
import NotificationBell from './NotificationBell'

const logoMark = `${import.meta.env.BASE_URL}logo-mark.png`

const NAV_ITEMS_PUBLIC = [
  { label: 'Форум',            to: '/forum'  },
  { label: 'Биржа',            to: '/market' },
  { label: 'Расписание',       to: '/schedule' },
  { label: 'Решбот',           to: '/gost', frozen: true },
  { label: 'Новости',          to: '/news' },
  { label: 'Преподаватели',    to: '/teachers' },
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
    // safe-area: при black-translucent контент уезжает под «шторку» iOS —
    // сдвигаем и стартовую позицию (marginTop), и точку залипания (top).
    <header
      className="sticky z-50 mx-3.5 sm:mx-6 mb-2 px-3 sm:px-5 py-3.5 rounded-[20px] bg-surface border border-line backdrop-blur-glass shadow-[0_18px_50px_rgba(20,8,50,.45),inset_0_1px_0_rgba(255,255,255,.18)] flex items-center gap-3 sm:gap-6"
      style={{
        top: 'env(safe-area-inset-top)',
        marginTop: 'calc(1.25rem + env(safe-area-inset-top))',
      }}
    >
      {/* Логотип */}
      <Link to="/" onClick={close} className="flex items-center gap-2 sm:gap-3 shrink-0">
        <img src={logoMark} alt="Ebu.Gubkin" className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,.4)]" />
        <div className="leading-none">
          <span className="font-bold text-[17px] sm:text-[21px] tracking-[-.5px] text-ink">
            Ebu<span className="bg-gradient-to-r from-mint to-lav bg-clip-text text-transparent font-bold">.Gubkin</span>
          </span>
          <span className="block text-[9px] sm:text-[10px] tracking-[1.5px] sm:tracking-[2px] text-subtle font-normal mt-1">ДЛЯ СТУДЕНТОВ</span>
        </div>
      </Link>

      {/* Навигация (desktop).
          Порог xl (1280), а не md (768): горизонтальному меню нужно ~1150-1220px
          (логотип ~165 + 6 пунктов с px-4 ~640 + пилюля кошелька/аватар/выход
          ~180-270 + mx/px/gap шапки 112). На md оно не влезало никуда, кроме
          настоящего десктопа: iPhone в ландшафте — это 667-956px, iPad в
          портрете — 768px, и там меню обрезалось справа.
          Плюс боковые safe-area (index.css) в ландшафте съедают ещё ~88px, а
          медиазапрос их не видит — он считает от вьюпорта, а не от доступной
          шапке ширины, поэтому запас должен быть с большим отрывом. */}
      <nav className="hidden xl:flex items-center gap-1 flex-1 ml-1.5">
        {items.map(({ label, to, frozen }) => (
          frozen && !profile?.is_owner ? (
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

            <NotificationBell />

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
            {/* На узких экранах логотип + «Регистрация» + бургер не влезают
                в 320px — кнопка уходит в мобильное меню (как и «Войти»). */}
            <Link
              to="/register"
              className="hidden sm:inline-flex px-4 py-2.5 text-sm font-semibold text-[#1a1140] bg-gradient-to-br from-white to-[#e9e4ff] rounded-[13px] shadow-[0_10px_26px_rgba(0,0,0,.28)]"
            >
              Регистрация
            </Link>
          </>
        )}

        {/* Burger (mobile only) */}
        <button
          className="xl:hidden flex items-center justify-center w-10 h-10 rounded-[14px] text-subtle hover:text-ink hover:bg-white/[.06] transition-colors"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Меню"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="xl:hidden absolute top-full left-0 right-0 mt-2 p-3 rounded-[20px] bg-[#241551]/95 border border-line backdrop-blur-glass shadow-[0_18px_50px_rgba(20,8,50,.6)]">
          <nav className="flex flex-col gap-1">
            {items.map(({ label, to, frozen }) => (
              frozen && !profile?.is_owner ? (
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
              <>
                <Link
                  to="/login"
                  onClick={close}
                  className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-subtle hover:text-ink hover:bg-white/[.06] transition-colors"
                >
                  Войти
                </Link>
                <Link
                  to="/register"
                  onClick={close}
                  className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-center text-[#1a1140] bg-gradient-to-br from-white to-[#e9e4ff]"
                >
                  Регистрация
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
      {gostFrozenModal}
    </header>
  )
}
