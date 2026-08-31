import { Link, useLocation } from 'react-router-dom'
import { LEGAL_DOCS } from '../pages/Legal'

// Страница чата занимает ровно оставшуюся высоту (см. MarketLayout/OrderChat) —
// обычный mt-12 футера добавлял 48px сверх этого расчёта и утаскивал страницу
// в прокрутку. На чате футер должен идти вплотную под полем ввода.
const CHAT_ROUTE_RE = /^\/market\/orders\/[^/]+\/chat\/?$/

export default function Footer() {
  const { pathname } = useLocation()
  const isChatPage = CHAT_ROUTE_RE.test(pathname)

  return (
    <footer className={`border-t border-line ${isChatPage ? '' : 'mt-12'}`}>
      <div
        className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <nav className="flex flex-wrap gap-x-5 gap-y-2 mb-3">
          {LEGAL_DOCS.map(d => (
            <Link
              key={d.slug}
              to={`/${d.slug}`}
              className="text-[13px] text-subtle hover:text-ink transition-colors"
            >
              {d.title}
            </Link>
          ))}
          <Link to="/support" className="text-[13px] text-subtle hover:text-ink transition-colors">
            Поддержка
          </Link>
          <a href="https://vk.ru/ebugubkin" target="_blank" rel="noopener noreferrer" className="text-[13px] text-subtle hover:text-ink transition-colors">
            ВКонтакте
          </a>
          <a href="https://t.me/ebugubkin" target="_blank" rel="noopener noreferrer" className="text-[13px] text-subtle hover:text-ink transition-colors">
            Telegram
          </a>
        </nav>
        <p className="text-[12px] text-subtle/70">
          Ebu.Gubkin — площадка для студенческих заказов и услуг. Сайт не является стороной сделок
          между пользователями.
        </p>
      </div>
    </footer>
  )
}
