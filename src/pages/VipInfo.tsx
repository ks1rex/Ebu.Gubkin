import { useEffect, useState } from 'react'
import { Crown, TrendingUp, Sparkles, ListPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiCall } from '../lib/api'
import { formatDate } from '../lib/format'
import { GlassCard, Button } from '../components/glass'
import { VipBadge } from '../components/VipBadge'
import LevelProgressBar from '../components/LevelProgressBar'

interface VipPricing {
  monthPrice: number
  yearPrice: number
  monthBasePrice: number
  yearBasePrice: number
  discountPercent: number
}

// Same rule the backend applies (utils/vip.js vipDiscountPct): +10% per level,
// level 10 an explicit exception at 100%.
const LEVEL_DISCOUNTS = Array.from({ length: 10 }, (_, i) => ({
  level: i + 1,
  discount: i + 1 >= 10 ? 100 : i * 10,
}))

// Reputation grants, mirrored from the backend calls to addReputation()
// (reshbirga: routes/forum.js, routes/orders.js). Keep in sync.
// Репутация только за биржу: форум её больше не даёт (иначе уровень и скидка
// VIP набивались бы постами). Отзывы двигают репутацию исполнителя в обе
// стороны — плохая оценка списывает.
const REP_SOURCES = [
  { amount: '+50', what: 'Завершённый заказ на бирже — исполнителю', negative: false },
  { amount: '+30', what: 'Отзыв с оценкой 5★ — исполнителю', negative: false },
  { amount: '+15', what: 'Отзыв с оценкой 4★ — исполнителю', negative: false },
  { amount: '0',   what: 'Отзыв с оценкой 3★ — ничего не меняет', negative: false },
  { amount: '−15', what: 'Отзыв с оценкой 2★ — списывается', negative: true },
  { amount: '−30', what: 'Отзыв с оценкой 1★ — списывается', negative: true },
]

// nbsp перед ₽: с обычным пробелом «1 500 ₽» рвётся на две строки в узких ячейках/кнопках.
const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`

export default function VipInfo() {
  const { profile, isVip } = useAuth()
  const [pricing, setPricing] = useState<VipPricing | null>(null)
  const [stats, setStats] = useState<{ level?: number; reputation?: number; next_level_reputation?: number | null } | null>(null)

  useEffect(() => {
    apiCall('GET', '/wallet/vip/price').then(setPricing).catch(() => {})
  }, [])

  useEffect(() => {
    if (!profile?.id) return
    apiCall('GET', `/profile/${profile.id}/public`).then(setStats).catch(() => {})
  }, [profile?.id])

  const level = stats?.level

  return (
    <div className="max-w-[760px] mx-auto flex flex-col gap-4">
      {/* Hero */}
      <GlassCard className="rounded-[26px] px-5 py-6 sm:px-8 sm:py-7">
        <div className="text-[13px] tracking-wide text-lav font-semibold uppercase">Подписка</div>
        <h1 className="text-[26px] sm:text-[32px] leading-[1.08] tracking-[-1px] font-bold mt-2.5 text-ink flex items-center gap-3">
          <Crown size={28} className="text-gold shrink-0" /> VIP-статус
        </h1>
        <p className="mt-2.5 text-sm text-subtle max-w-[520px] leading-relaxed">
          Приоритет на бирже, больше объявлений и заметное оформление профиля.
          Чем выше ваш уровень — тем дешевле подписка.
        </p>
      </GlassCard>

      {/* Что даёт */}
      <GlassCard className="rounded-[20px] p-6">
        <h2 className="text-lg font-bold text-ink mb-4">Что даёт VIP</h2>
        <div className="flex flex-col gap-4">
          <div className="flex gap-3.5">
            <div className="w-10 h-10 rounded-[12px] bg-accent/[.18] grid place-items-center shrink-0">
              <TrendingUp size={18} className="text-lav" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink mb-1">Приоритет на бирже</h3>
              <p className="text-[13px] text-subtle leading-relaxed">
                Ваши заказы и услуги показываются выше обычных при любой сортировке —
                и «по рейтингу», и «по новизне».
              </p>
            </div>
          </div>

          <div className="flex gap-3.5">
            <div className="w-10 h-10 rounded-[12px] bg-pink/[.18] grid place-items-center shrink-0">
              <Sparkles size={18} className="text-pink" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink mb-1 flex items-center gap-2">
                Косметика <VipBadge size="sm" />
              </h3>
              <p className="text-[13px] text-subtle leading-relaxed mb-2">
                Три элемента, которые видно везде, где показан ваш ник — на бирже,
                форуме, в чатах и профиле:
              </p>
              <ul className="text-[13px] text-ink/90 flex flex-col gap-1">
                <li>· Градиентная плашка с короной «VIP» рядом с ником</li>
                <li>· Градиентная заливка самого никнейма</li>
                <li>· Градиентная рамка со свечением вокруг аватара</li>
              </ul>
              <p className="text-xs text-subtle mt-2 leading-relaxed">
                Оформление одинаково для всех уровней и исчезает автоматически,
                когда подписка истекает.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5">
            <div className="w-10 h-10 rounded-[12px] bg-mint/[.15] grid place-items-center shrink-0">
              <ListPlus size={18} className="text-mint" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink mb-1">Больше объявлений на бирже</h3>
              <p className="text-[13px] text-subtle leading-relaxed">
                Повышенный лимит одновременно активных заказов и услуг по сравнению
                с обычным аккаунтом.
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Тарифы */}
      <GlassCard className="rounded-[20px] p-5 sm:p-6">
        <h2 className="text-lg font-bold text-ink mb-1">Тарифы и скидка по уровню</h2>
        <p className="text-[13px] text-subtle mb-4 leading-relaxed">
          Базовые цены: месяц — {rub(pricing?.monthBasePrice ?? 300)}, год — {rub(pricing?.yearBasePrice ?? 1500)}.
          Скидка зависит от вашего уровня и применяется автоматически.
        </p>

        {/* whitespace-nowrap + full-bleed на мобильном: 4 колонки в 272px
            сжимались и «1 500 ₽»/«бесплатно» переносились по слогам. Теперь
            таблица честно скроллится по горизонтали (как в Schedule). */}
        <div className="overflow-x-auto -mx-5 px-5 sm:-mx-1 sm:px-1">
          <table className="w-full text-[13px] border-collapse whitespace-nowrap">
            <thead>
              <tr className="text-subtle text-left">
                <th className="font-medium py-2 pr-3">Уровень</th>
                <th className="font-medium py-2 pr-3">Скидка</th>
                <th className="font-medium py-2 pr-3">Месяц</th>
                <th className="font-medium py-2">Год</th>
              </tr>
            </thead>
            <tbody>
              {LEVEL_DISCOUNTS.map(row => {
                const isCurrent = row.level === level
                const base = { m: pricing?.monthBasePrice ?? 300, y: pricing?.yearBasePrice ?? 1500 }
                const price = (b: number) => Math.round(b * (100 - row.discount)) / 100
                return (
                  <tr
                    key={row.level}
                    className={`border-t border-white/[.08] ${isCurrent ? 'bg-accent/[.14] text-ink font-semibold' : 'text-ink/85'}`}
                  >
                    <td className="py-2 pr-3 rounded-l-lg">
                      {row.level}{isCurrent && <span className="text-lav font-normal"> · вы</span>}
                    </td>
                    <td className="py-2 pr-3">{row.discount}%</td>
                    <td className="py-2 pr-3">{row.discount === 100 ? 'бесплатно' : rub(price(base.m))}</td>
                    <td className="py-2 rounded-r-lg">{row.discount === 100 ? 'бесплатно' : rub(price(base.y))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-subtle mt-4 leading-relaxed">
          Повторная покупка не перезаписывает срок, а добавляет дни к уже имеющемуся —
          можно продлевать сколько угодно раз, в том числе пока подписка ещё активна.
        </p>
      </GlassCard>

      {/* Уровень */}
      <GlassCard className="rounded-[20px] p-6">
        <h2 className="text-lg font-bold text-ink mb-4">Как получить уровень</h2>

        {level != null && (
          <div className="mb-5">
            <LevelProgressBar
              level={level}
              reputation={stats?.reputation ?? 0}
              nextLevelReputation={stats?.next_level_reputation}
              maxLevelNote="Максимальный уровень — VIP для вас бесплатный."
            />
          </div>
        )}

        <p className="text-[13px] text-subtle mb-3 leading-relaxed">
          Уровень поднимается за репутацию. Репутация начисляется автоматически
          и только за работу на бирже:
        </p>
        <ul className="flex flex-col gap-1.5">
          {REP_SOURCES.map(s => (
            <li key={s.what} className="flex gap-3 text-[13px] text-ink/90">
              <b className={`font-semibold w-9 shrink-0 text-right ${s.negative ? 'text-error' : 'text-mint'}`}>
                {s.amount}
              </b>
              <span className="leading-relaxed">{s.what}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-subtle mt-3 leading-relaxed">
          Плохой отзыв списывает репутацию, но ниже нуля она не опускается — уровень
          может понизиться, «долга» не бывает. Репутацию двигают только отзывы о вас
          как об исполнителе: заказчику отзывы исполнителей репутацию не меняют.
          Форум на репутацию не влияет.
        </p>
        <p className="text-xs text-subtle mt-2 leading-relaxed">
          Всего 10 уровней. Порог 10-го — 18 000 репутации.
        </p>
      </GlassCard>

      {/* Действие */}
      <GlassCard className="rounded-[20px] p-6 !bg-gradient-to-br !from-accent/[.18] !to-pink/[.16]">
        {isVip ? (
          <div className="flex items-center gap-3">
            <Crown size={20} className="text-gold shrink-0" />
            <p className="text-sm text-ink">
              VIP активен до <span className="font-semibold">{formatDate(profile?.vip_expires_at)}</span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <p className="text-sm text-subtle leading-relaxed">
              {pricing?.monthPrice === 0
                ? 'Ваш уровень даёт VIP без списания с баланса.'
                : 'Оформить можно в кошельке — сумма спишется с баланса.'}
            </p>
            <Button to="/wallet" variant="mint" className="shrink-0">
              {pricing?.monthPrice === 0 ? 'Активировать бесплатно' : 'Купить VIP'}
            </Button>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
