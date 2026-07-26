import { useEffect, useState } from 'react'
import { Loader2, Crown, Download, Printer, Clock, Plus, X, Search } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { apiCall } from '../../lib/api'
import { stampedName } from '../../lib/reportData'
import { downloadXlsx } from '../../lib/exportXlsx'
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
  const [acting, setActing] = useState<Record<string, boolean>>({})
  // Выдача VIP человеку, которого ещё нет в списке подписок: ищем по нику
  // через тот же /admin/users, отдельного поиска для этого не нужно.
  const [grantNick, setGrantNick] = useState('')
  const [grantDays, setGrantDays] = useState('30')
  const [granting, setGranting] = useState(false)

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

  async function extend(userId: string, nickname: string, days: number) {
    setActing(a => ({ ...a, [userId]: true }))
    try {
      await apiCall('POST', `/admin/vip/${userId}/extend`, { days })
      toast(`${nickname}: +${days} дн. VIP`, 'success')
      await fetchData()
    } catch (e: any) {
      toast(e?.data?.error ?? 'Не удалось продлить подписку', 'error')
    } finally {
      setActing(a => ({ ...a, [userId]: false }))
    }
  }

  async function cancel(userId: string, nickname: string) {
    if (!confirm(`Снять VIP у ${nickname}? Деньги не возвращаются, объявления сверх базового лимита сразу скроются.`)) return
    setActing(a => ({ ...a, [userId]: true }))
    try {
      const r = await apiCall('POST', `/admin/vip/${userId}/cancel`)
      toast(r.hidden_items ? `VIP снят, скрыто объявлений: ${r.hidden_items}` : 'VIP снят', 'success')
      await fetchData()
    } catch (e: any) {
      toast(e?.data?.error ?? 'Не удалось снять подписку', 'error')
    } finally {
      setActing(a => ({ ...a, [userId]: false }))
    }
  }

  // Выдать VIP по никнейму: ищем пользователя, затем продлеваем ему подписку.
  async function grantByNickname() {
    const nick = grantNick.trim()
    const days = parseInt(grantDays, 10)
    if (!nick) return
    if (!Number.isFinite(days) || days < 1) { toast('Число дней — от 1', 'error'); return }
    setGranting(true)
    try {
      const found = await apiCall('GET', `/admin/users?search=${encodeURIComponent(nick)}&limit=5`)
      const list: { id: string; nickname: string | null }[] = found.users ?? []
      const exact = list.find(u => (u.nickname ?? '').toLowerCase() === nick.toLowerCase()) ?? list[0]
      if (!exact) { toast('Пользователь не найден', 'error'); return }
      await apiCall('POST', `/admin/vip/${exact.id}/extend`, { days })
      toast(`${exact.nickname ?? exact.id}: +${days} дн. VIP`, 'success')
      setGrantNick('')
      await fetchData()
    } catch (e: any) {
      toast(e?.data?.error ?? 'Не удалось выдать подписку', 'error')
    } finally {
      setGranting(false)
    }
  }

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
    downloadXlsx(stampedName('vip-подписки'), SUB_HEADERS, subRows)
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
            Excel
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
          Проценты задаются в «Настройках» → «Скидка на подписку по уровню» (десять
          значений через запятую). Пока настройка пуста, действует правило по умолчанию:
          +10% за каждый уровень выше первого, на 10-м подписка бесплатна. Таблица
          показывает ровно те цены, которые человек увидит при покупке.
        </p>
      </div>

      {/* Выдать VIP вручную */}
      <div className="bg-surface rounded-xl border border-line p-5 space-y-3 no-print">
        <h2 className="font-semibold text-ink text-sm">Выдать или продлить вручную</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
            <input
              type="text"
              value={grantNick}
              onChange={e => setGrantNick(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && grantByNickname()}
              placeholder="Никнейм пользователя"
              className="pl-7 pr-3 py-1.5 w-56 rounded-lg border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <input
            type="number"
            min={1}
            value={grantDays}
            onChange={e => setGrantDays(e.target.value)}
            className="w-24 px-3 py-1.5 rounded-lg border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-accent"
          />
          <span className="text-sm text-subtle pb-1.5">дней</span>
          <button onClick={grantByNickname} disabled={granting || !grantNick.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">
            {granting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Выдать
          </button>
        </div>
        <p className="text-xs text-subtle">
          Деньги с баланса не списываются, в выручку VIP такая выдача не попадает —
          это подарок или компенсация, а не покупка. Дни прибавляются к текущему сроку,
          если подписка ещё активна. Событие уходит в Telegram.
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
                  <th className="px-3 py-2 font-medium text-right">Осталось</th>
                  <th className="px-5 py-2 font-medium text-right no-print">Действия</th>
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
                      <td className="px-3 py-2 text-right">
                        <span className={`inline-flex items-center gap-1 ${left <= 7 ? 'text-warning' : 'text-ink'}`}>
                          {left <= 7 && <Clock size={12} />}
                          {left} дн.
                        </span>
                      </td>
                      <td className="px-5 py-2 text-right no-print">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => extend(s.id, s.nickname ?? s.id.slice(0, 8), 30)}
                            disabled={acting[s.id]}
                            title="Продлить на 30 дней"
                            className="p-1.5 rounded-lg text-subtle hover:text-accent hover:bg-panel transition-colors disabled:opacity-50"
                          >
                            {acting[s.id] ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                          </button>
                          <button
                            onClick={() => cancel(s.id, s.nickname ?? s.id.slice(0, 8))}
                            disabled={acting[s.id]}
                            title="Снять подписку"
                            className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                          >
                            <X size={14} />
                          </button>
                        </div>
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
        Снятие подписки не возвращает деньги: если нужен возврат, проведите его отдельно
        через кошелёк. Объявления сверх базового лимита при снятии скрываются сразу
        (не удаляются). Покупки пользователей видны в «Журнале» по типу «Покупка VIP».
      </p>
    </div>
  )
}
