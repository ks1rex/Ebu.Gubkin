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
} from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/admin',                icon: LayoutDashboard, label: 'Дашборд',     end: true },
  { to: '/admin/finance',        icon: TrendingUp,      label: 'Финансы' },
  { to: '/admin/deposits',       icon: ArrowDownCircle, label: 'Пополнения' },
  { to: '/admin/withdrawals',    icon: ArrowUpCircle,   label: 'Выводы' },
  { to: '/admin/disputes',       icon: Scale,           label: 'Споры' },
  { to: '/admin/forum',          icon: MessageSquare,   label: 'Форум' },
  { to: '/admin/gost',           icon: FileText,        label: 'ГОСТ-шаблоны' },
  { to: '/admin/schedule-warmup', icon: CalendarClock,  label: 'Прогрев расписания' },
  { to: '/admin/orders',         icon: BookOpen,        label: 'Заказы' },
  { to: '/admin/conversations',  icon: MessageCircle,   label: 'Чаты' },
  { to: '/admin/chat-mod',       icon: ShieldAlert,     label: 'Модерация' },
  { to: '/admin/support',        icon: LifeBuoy,        label: 'Поддержка' },
  { to: '/admin/ledger',         icon: ScrollText,      label: 'Журнал' },
  { to: '/admin/users',          icon: Users,           label: 'Пользователи' },
  { to: '/admin/settings',       icon: Settings,        label: 'Настройки' },
]

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)

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

        <nav className="flex flex-col gap-1 px-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
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
      <main className="flex-1 overflow-auto p-6">
        {/* Mobile section grid — replaces the sidebar nav below lg, shown on every admin page */}
        <div className="grid grid-cols-4 gap-3 lg:hidden mb-6">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="flex flex-col items-center gap-1 p-3 bg-surface border border-line rounded-xl hover:bg-accent-subtle transition-colors text-center"
            >
              {({ isActive }) => (
                <>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    isActive ? 'bg-accent' : 'bg-accent-subtle'
                  }`}>
                    <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-accent'}`} />
                  </div>
                  <span className={`text-xs leading-tight ${isActive ? 'text-ink font-medium' : 'text-subtle'}`}>{label}</span>
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
