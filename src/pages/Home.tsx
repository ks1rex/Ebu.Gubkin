import { Link } from 'react-router-dom'
import { BookOpen, Briefcase, FileText, Wallet } from 'lucide-react'

const SECTIONS = [
  {
    icon: BookOpen,
    label: 'Форум',
    desc:  'Обсуждения по предметам, курсам и жизни университета',
    to:    '/forum',
  },
  {
    icon: Briefcase,
    label: 'Биржа',
    desc:  'Заказы и услуги между студентами — быстро и безопасно',
    to:    '/market',
  },
  {
    icon: FileText,
    label: 'ГОСТ-калькулятор',
    desc:  'AI-генерация документов по ГОСТ с автоформатированием',
    to:    '/gost',
  },
  {
    icon: Wallet,
    label: 'Кошелёк',
    desc:  'Рублёвый баланс и ГОСТ-токены в одном месте',
    to:    '/wallet',
  },
]

export default function Home() {
  return (
    <div>
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h1 className="text-4xl font-bold text-ink mb-3 tracking-tight">
          Ebu.Gubkin
        </h1>
        <p className="text-lg text-subtle">
          Студенческая платформа Губкинского университета.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SECTIONS.map(({ icon: Icon, label, desc, to }) => (
          <Link
            key={to}
            to={to}
            className="group p-6 bg-surface rounded-xl border border-line hover:border-accent/40 hover:shadow-sm transition-all duration-150"
          >
            <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
              <Icon size={20} className="text-accent" />
            </div>
            <h2 className="font-semibold text-ink mb-1">{label}</h2>
            <p className="text-sm text-subtle leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
