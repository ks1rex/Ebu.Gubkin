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
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Link
          to="/market"
          className="inline-flex items-center gap-[5px] text-slate-500 no-underline text-[0.85rem] shrink-0"
        >
          <ArrowLeft size={14} /> Биржа
        </Link>

        <div className="flex gap-1 flex-wrap">
          {TABS.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== '/market/orders' && to !== '/market/services' && pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={`inline-flex items-center gap-[5px] py-[5px] px-3 rounded-lg text-[0.8rem] font-medium no-underline border ${
                  active ? 'bg-[#14a89a22] text-teal-legacy border-[#14a89a55]' : 'bg-transparent text-slate-500 border-transparent'
                }`}
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
