import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  MessageSquare,
  MessageCircle,
  Users,
  Settings,
  Menu,
  X,
  BookOpen,
  ScrollText,
  ShieldAlert,
  LifeBuoy,
  FileText,
  CalendarClock,
  Crown,
  HelpCircle,
  Eye,
  EyeOff,
  Newspaper,
  GraduationCap,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

// ownerOnly: true — скрыт от тарифа «админ» (и на фронте, и 403 на бэкенде,
// см. reshbirga routes/admin.js). Не указан/false — доступен обоим тарифам
// (Настройки и Справка тоже доступны, но их содержимое само сужается для
// не-владельца — см. Settings.tsx / Help.tsx).
export const NAV_ITEMS = [
  { to: '/admin',                icon: LayoutDashboard, label: 'Дашборд',     end: true, ownerOnly: true },
  { to: '/admin/finance',        icon: TrendingUp,      label: 'Финансы',                ownerOnly: true },
  { to: '/admin/deposits',       icon: ArrowDownCircle, label: 'Пополнения',             ownerOnly: true },
  { to: '/admin/withdrawals',    icon: ArrowUpCircle,   label: 'Выводы',                 ownerOnly: true },
  { to: '/admin/disputes',       icon: Scale,           label: 'Споры' },
  { to: '/admin/news',           icon: Newspaper,       label: 'Новости',                ownerOnly: true },
  { to: '/admin/teachers',       icon: GraduationCap,   label: 'Преподаватели',          ownerOnly: true },
  { to: '/admin/forum',          icon: MessageSquare,   label: 'Форум' },
  { to: '/admin/gost',           icon: FileText,        label: 'Решбот-шаблоны',         ownerOnly: true },
  { to: '/admin/schedule-warmup', icon: CalendarClock,  label: 'Прогрев расписания',     ownerOnly: true },
  { to: '/admin/orders',         icon: BookOpen,        label: 'Заказы' },
  { to: '/admin/conversations',  icon: MessageCircle,   label: 'Чаты',                   ownerOnly: true },
  { to: '/admin/chat-mod',       icon: ShieldAlert,     label: 'Модерация' },
  { to: '/admin/support',        icon: LifeBuoy,        label: 'Поддержка' },
  { to: '/admin/ledger',         icon: ScrollText,      label: 'Журнал',                 ownerOnly: true },
  { to: '/admin/users',          icon: Users,           label: 'Пользователи' },
  { to: '/admin/vip',            icon: Crown,           label: 'VIP / подписки',         ownerOnly: true },
  { to: '/admin/settings',       icon: Settings,        label: 'Настройки' },
  { to: '/admin/help',           icon: HelpCircle,      label: 'Справка' },
]

// Пути, доступные тарифу «админ» — используется AdminRoute для блокировки
// прямого перехода по URL и здесь для фильтрации меню.
export const ADMIN_TIER_PATHS = NAV_ITEMS.filter(i => !i.ownerOnly).map(i => i.to)

/**
 * Тумблер «Смотреть как админ» — не витрина: реально переключает is_owner на
 * бэкенде (POST /profile/view-as-admin, см. AuthContext.toggleViewAsAdmin),
 * поэтому owner-only маршруты честно начинают отдавать 403, пока включено.
 * Виден, если сейчас is_owner ИЛИ остался is_owner_was (можно вернуться
 * обратно даже после неудачного переключения).
 */
function ViewAsAdminToggle() {
  const { profile, toggleViewAsAdmin } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  if (!profile?.is_owner && !profile?.is_owner_was) return null

  async function handleClick() {
    setBusy(true)
    try {
      await toggleViewAsAdmin()
    } catch {
      toast('Не удалось переключить режим', 'error')
    } finally {
      setBusy(false)
    }
  }

  const viewingAsAdmin = !profile.is_owner

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
        viewingAsAdmin
          ? 'bg-accent text-white'
          : 'bg-panel text-subtle hover:text-ink border border-line'
      }`}
      title={viewingAsAdmin ? 'Вернуть права владельца' : 'Демо-режим: реально снимает права владельца'}
    >
      {viewingAsAdmin ? <EyeOff size={14} /> : <Eye size={14} />}
      {viewingAsAdmin ? 'Вернуться к владельцу' : 'Смотреть как админ'}
    </button>
  )
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { profile } = useAuth()
  const items = NAV_ITEMS.filter(i => !i.ownerOnly || profile?.is_owner)

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Sidebar — desktop only; mobile uses the icon grid in <main> below */}
      <aside
        className={`hidden lg:flex shrink-0 bg-surface border-r border-line flex-col py-4 transition-all duration-200 ${
          collapsed ? 'w-14' : 'w-52'
        }`}
      >
        <div className="flex items-center justify-between px-3 mb-4">
          {!collapsed && (
            <span className="text-xs font-semibold text-subtle uppercase tracking-wider">
              Админ
            </span>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded hover:bg-panel text-subtle hover:text-ink transition-colors"
            title={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>

        {!collapsed && (
          <div className="px-2 mb-3">
            <ViewAsAdminToggle />
          </div>
        )}

        <nav className="flex flex-col gap-1 px-2">
          {items.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-accent-subtle text-accent font-medium'
                    : 'text-subtle hover:text-ink hover:bg-panel'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="lg:hidden mb-4">
          <ViewAsAdminToggle />
        </div>

        {/* Mobile section grid — replaces the sidebar nav below lg, shown on every admin page.
            Админка вложена в <main> Layout'а, так что на 320px тут остаётся ~240px:
            4 колонки давали 51px на ячейку при иконке 48px + p-3 — плитки лезли
            друг на друга. 3 колонки + уменьшенные отступы/иконки влезают. */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 lg:hidden mb-6">
          {items.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="flex flex-col items-center gap-1 p-2 sm:p-3 bg-surface border border-line rounded-xl hover:bg-accent-subtle transition-colors text-center"
            >
              {({ isActive }) => (
                <>
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? 'bg-accent' : 'bg-accent-subtle'
                  }`}>
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? 'text-white' : 'text-accent'}`} />
                  </div>
                  <span className={`text-[11px] sm:text-xs leading-tight break-words w-full ${isActive ? 'text-ink font-medium' : 'text-subtle'}`}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <Outlet />
      </main>
    </div>
  )
}
