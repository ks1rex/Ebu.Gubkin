import { Link } from 'react-router-dom'
import { LEGAL_DOCS } from '../pages/Legal'

export default function Footer() {
  return (
    <footer className="border-t border-line mt-12">
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
        </nav>
        <p className="text-[12px] text-subtle/70">
          СтудБиржа — площадка для студенческих заказов и услуг. Сайт не является стороной сделок
          между пользователями.
        </p>
      </div>
    </footer>
  )
}
