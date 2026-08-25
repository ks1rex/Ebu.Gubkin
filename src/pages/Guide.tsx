import { Link } from 'react-router-dom'
import { Briefcase, MessageSquare, Wallet, Newspaper } from 'lucide-react'
import { GlassCard } from '../components/glass'

const SECTIONS = [
  {
    icon: Briefcase,
    color: 'text-mint',
    bg: 'bg-mint/[.15]',
    title: 'Биржа',
    to: '/market',
    text: 'Нужна помощь с учёбой — размести заказ, и исполнители сами откликнутся. Умеешь помогать другим — выбирай заказы или выложи свою услугу в каталог и зарабатывай.',
  },
  {
    icon: MessageSquare,
    color: 'text-lav',
    bg: 'bg-lav/[.15]',
    title: 'Форум',
    to: '/forum',
    text: 'Общайся со студентами Губки, задавай вопросы и делись опытом. Есть разделы по темам — заходи и пиши.',
  },
  {
    icon: Wallet,
    color: 'text-pink',
    bg: 'bg-pink/[.15]',
    title: 'Кошелёк',
    to: '/wallet',
    text: 'Здесь хранятся твои деньги на платформе — пополняй баланс, оплачивай заказы на бирже и выводи заработанное.',
  },
  {
    icon: Newspaper,
    color: 'text-gold',
    bg: 'bg-gold/[.15]',
    title: 'Новости',
    to: '/news',
    text: 'Следи за новостями — здесь мы рассказываем, что нового появилось на сайте.',
  },
]

export default function Guide() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-2">Как это работает</h1>
      <p className="text-sm text-subtle mb-6">Коротко о том, что можно делать на Ebu.Gubkin.</p>

      <div className="flex flex-col gap-4">
        {SECTIONS.map(s => (
          <Link key={s.to} to={s.to}>
            <GlassCard hover className="rounded-2xl p-5 flex items-start gap-4">
              <div className={`w-11 h-11 rounded-[13px] ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div>
                <h3 className="font-semibold text-ink mb-1">{s.title}</h3>
                <p className="text-sm text-subtle leading-relaxed">{s.text}</p>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>

      <p className="text-xs text-subtle text-center mt-8">
        Остались вопросы? Пиши в <Link to="/support" className="text-accent hover:underline">поддержку</Link>.
      </p>
    </div>
  )
}
