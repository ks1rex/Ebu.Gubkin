import { useEffect, useState } from 'react'
import { Loader2, Crown, Download, Printer, Clock } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { apiCall } from '../../lib/api'
import { downloadCsv, stampedName } from '../../lib/exportCsv'
import { printReport } from '../../lib/printReport'

/**
 * VIP / подписки. Данные берутся из GET /admin/vip — там же считается таблица
 * скидок по уровню, тем же vipDiscountPct, что применяется при покупке.
 * Дублировать формулу скидки на фронте нельзя: цена разъедется с реальной
 * при первой правке правила на сервере.
 */

interface Subscriber {
  id: string
  nickname: string | null
  level: number | null
  vip_expires_at: string
}

interface LevelDiscount {
  level: number
  discount_pct: number
  month_price: number
  year_price: number
}

interface VipData {
  plans: {
    month: { base_price: number; days: number }
    year:  { base_price: number; days: number }
  }
  gost_token_discount_pct: number
  level_discounts: LevelDiscount[]
  revenue: number
  purchases_count: number
  active_count: number
  expiring_week_count: number
  subscribers: Subscriber[]
}

const BTN = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-line rounded-lg hover:bg-panel text-ink transition-colors'

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}

function Card({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-surface rounded-xl border border-line p-4">
      <div className="text-sm text-subtle">{label}</div>
      <div className="text-2xl font-bold text-ink mt-1">{value}</div>
      {sub && <div className="text-xs text-subtle mt-1">{sub}</div>}
    </div>
  )
}

export default function AdminVip() {
  const toast = useToast()

  const [data, setData] = useState<VipData | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    try {
      setData(await apiCall('GET', '/admin/vip'))
    } catch {
      toast('Не удалось загрузить данные по подпискам', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
  }

  if (!data) {
    return (
      <div className="text-center py-32">
        <p className="text-subtle mb-4">Нет данных</p>
        <button onClick={fetchData} className="text-accent hover:underline text-sm">Повторить</button>
      </div>
    )
  }

  const SUB_HEADERS = ['Никнейм', 'Уровень', 'Подписка до', 'Осталось дней']
  const subRows = data.subscribers.map(s => [
    s.nickname ?? s.id.slice(0, 8),
    s.level ?? '',
    new Date(s.vip_expires_at).toLocaleString('ru-RU'),
    daysLeft(s.vip_expires_at),
  ])

  function exportSubscribers() {
    downloadCsv(stampedName('vip-подписки'), SUB_HEADERS, subRows)
  }

  function printSubscribers() {
    printReport({
      title: 'VIP-подписки',
      meta: [
        ['Активных подписок', String(data!.active_count)],
        ['Истекают в течение недели', String(data!.expiring_week_count)],
        ['Выручка VIP, ₽', fmt(data!.revenue)],
        ['Покупок всего', String(data!.purchases_count)],
      ],
      headers: SUB_HEADERS,
      rows: subRows,
      numeric: [1, 3],
      totals: [['Активных подписок', String(data!.subscribers.length)]],
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-ink flex items-center gap-2">
          <Crown size={18} className="text-gold" />
          VIP / подписки
        </h1>
        <div className="flex gap-2 no-print">
          <button onClick={exportSubscribers} className={BTN}>
            <Download size={14} />
            CSV
          </button>
          <button onClick={printSubscribers} className={BTN}>
            <Printer size={14} />
            PDF / печать
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Активных подписок" value={data.active_count} sub="срок не истёк" />
        <Card label="Истекают за неделю" value={data.expiring_week_count} sub="стоит напомнить" />
        <Card label="Выручка VIP" value={`${fmt(data.revenue)} ₽`} sub="за всё время" />
        <Card label="Покупок всего" value={data.purchases_count} sub="включая продления" />
      </div>

      {/* Тарифы */}
      <div className="bg-surface rounded-xl border border-line p-5 space-y-3">
        <h2 className="font-semibold text-ink text-sm">Тарифы</h2>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line">
            <tr>
              <td className="py-2 text-subtle">Месячная подписка</td>
              <td className="py-2 text-right text-ink font-medium">{fmt(data.plans.month.base_price)} ₽</td>
              <td className="py-2 text-right text-subtle w-24">{data.plans.month.days} дн.</td>
            </tr>
            <tr>
              <td className="py-2 text-subtle">Годовая подписка</td>
              <td className="py-2 text-right text-ink font-medium">{fmt(data.plans.year.base_price)} ₽</td>
              <td className="py-2 text-right text-subtle w-24">{data.plans.year.days} дн.</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-subtle">
          Это базовые цены из «Настроек» (до скидки по уровню). Скидка VIP на ГОСТ-токены —{' '}
          <strong className="text-ink">{data.gost_token_discount_pct}%</strong>.
          Покупка списывается с баланса кошелька, подписка не продлевается сама, повторная
          покупка добавляет дни к текущему сроку.
        </p>
      </div>

      {/* Скидка по уровню */}
      <div className="bg-surface rounded-xl border border-line p-5 space-y-3">
        <h2 className="font-semibold text-ink text-sm">Скидка на подписку по уровню</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[380px]">
            <thead>
              <tr className="text-left text-xs text-subtle border-b border-line">
                <th className="py-2 font-medium">Уровень</th>
                <th className="py-2 font-medium text-right">Скидка</th>
                <th className="py-2 font-medium text-right">Месяц</th>
                <th className="py-2 font-medium text-right">Год</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.level_discounts.map(d => (
                <tr key={d.level}>
                  <td className="py-1.5 text-ink">{d.level}</td>
                  <td className="py-1.5 text-right text-accent">{d.discount_pct}%</td>
                  <td className="py-1.5 text-right text-ink">{fmt(d.month_price)} ₽</td>
                  <td className="py-1.5 text-right text-ink">{fmt(d.year_price)} ₽</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-subtle">
          Правило зашито в коде сервера (+10% за каждый уровень выше первого, на 10-м
          уровне подписка бесплатна) и в «Настройках» не меняется — таблица показывает
          ровно те цены, которые человек увидит при покупке.
        </p>
      </div>

      {/* Действующие подписки */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="font-semibold text-ink text-sm">Действующие подписки</h2>
        </div>
        {data.subscribers.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-subtle">Активных подписок нет.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="text-left text-xs text-subtle border-y border-line bg-panel/40">
                  <th className="px-5 py-2 font-medium">Пользователь</th>
                  <th className="px-3 py-2 font-medium">Уровень</th>
                  <th className="px-3 py-2 font-medium">Подписка до</th>
                  <th className="px-5 py-2 font-medium text-right">Осталось</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.subscribers.map(s => {
                  const left = daysLeft(s.vip_expires_at)
                  return (
                    <tr key={s.id}>
                      <td className="px-5 py-2 text-ink">{s.nickname ?? s.id.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-subtle">{s.level ?? '—'}</td>
                      <td className="px-3 py-2 text-subtle">{new Date(s.vip_expires_at).toLocaleDateString('ru-RU')}</td>
                      <td className="px-5 py-2 text-right">
                        <span className={`inline-flex items-center gap-1 ${left <= 7 ? 'text-warning' : 'text-ink'}`}>
                          {left <= 7 && <Clock size={12} />}
                          {left} дн.
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-subtle">
        Отменить или продлить подписку из админки нельзя — она покупается пользователем
        с баланса и истекает сама. Все покупки видны в «Журнале» по типу «Покупка VIP».
      </p>
    </div>
  )
}
