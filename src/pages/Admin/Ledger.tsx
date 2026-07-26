import { useEffect, useState } from 'react'
import { Loader2, Plus, Minus, Search, ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'
import { apiCall } from '../../lib/api'
import { downloadCsv, stampedName, fetchAllPages } from '../../lib/exportCsv'
import { printReport } from '../../lib/printReport'
import { VipBadge } from '../../components/VipBadge'

// Полный список типов из transaction_type. Раньше здесь не было vip_purchase,
// balance_to_token, deposit_referral и order_refund_excess — они показывались
// сырым ключом и отсутствовали в фильтре «Все типы».
const TX_LABELS: Record<string, string> = {
  deposit:                 'Пополнение',
  deposit_referral:        'Пополнение (реферальное)',
  withdrawal:              'Вывод',
  order_payment:           'Оплата заказа',
  order_cancel_refund:     'Возврат (отмена)',
  order_refund_excess:     'Возврат излишка',
  order_topup:             'Доплата по заказу',
  order_payout:            'Выплата исполнителю',
  dispute_refund_customer: 'Возврат (спор)',
  dispute_refund_full:     'Возврат (спор, полный)',
  deposit_hold:            'Заморозка',
  deposit_release:         'Разморозка',
  deposit_forfeit:         'Конфискация',
  referral_bonus:          'Реферальный бонус',
  vip_purchase:            'Покупка VIP',
  balance_to_token:        'Покупка ГОСТ-токенов',
}

const TX_TYPES = Object.keys(TX_LABELS)

// deposit_referral — это зачисление на баланс (реферальное пополнение), а не
// списание: раньше он не попадал в этот набор и рисовался красным минусом.
const INCOME_TYPES = new Set([
  'deposit', 'deposit_referral', 'order_payout', 'dispute_refund_customer',
  'dispute_refund_full', 'deposit_release', 'order_cancel_refund',
  'order_refund_excess', 'referral_bonus',
])

interface TxEntry {
  id: string
  type: string
  amount: number
  status: string
  created_at: string
  order_id: string | null
  platform_profit: number | null
  user: { id: string; nickname: string | null; is_vip?: boolean } | null
}

const INPUT = 'px-3 py-1.5 rounded-lg border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-accent transition-colors'
const BTN   = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-line rounded-lg hover:bg-panel text-ink transition-colors'

const STATUS_LABELS: Record<string, string> = {
  completed: 'Выполнено', rejected: 'Отклонено', pending: 'В обработке',
}

const LIMIT = 100

export default function AdminLedger() {
  const toast = useToast()

  const [entries, setEntries] = useState<TxEntry[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const [filterType, setFilterType] = useState('')
  const [filterNick, setFilterNick] = useState('')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')

  function params(p: number, limit: number) {
    const q = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (filterType) q.set('type', filterType)
    if (filterNick) q.set('nickname', filterNick)
    if (dateFrom)   q.set('date_from', dateFrom)
    if (dateTo)     q.set('date_to', dateTo)
    return q
  }

  async function fetchLedger(p = 1) {
    setLoading(true)
    try {
      const data = await apiCall('GET', `/admin/ledger?${params(p, LIMIT)}`)
      setEntries(data.entries ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch {
      toast('Не удалось загрузить журнал транзакций', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLedger(1) }, [])

  // Весь отфильтрованный набор постранично: одним запросом с большим limit его
  // не забрать — PostgREST молча отдаёт максимум 1000 строк.
  async function fetchExportRows() {
    return fetchAllPages<TxEntry>(async (p, limit) => {
      const data = await apiCall('GET', `/admin/ledger?${params(p, limit)}`)
      return { rows: data.entries ?? [], total: data.total ?? 0 }
    })
  }

  const EXPORT_HEADERS = ['Дата', 'Пользователь', 'Тип', 'Направление', 'Сумма', 'Прибыль платформы', 'Статус', 'Заказ']

  function exportRow(tx: TxEntry) {
    return [
      new Date(tx.created_at).toLocaleString('ru-RU'),
      tx.user?.nickname ?? '',
      TX_LABELS[tx.type] ?? tx.type,
      INCOME_TYPES.has(tx.type) ? 'приход' : 'расход',
      tx.amount,
      tx.platform_profit ?? '',
      STATUS_LABELS[tx.status] ?? tx.status,
      tx.order_id ?? '',
    ]
  }

  // Параметры выборки в шапке отчёта — иначе по файлу не понять, что в нём.
  function reportMeta(): [string, string][] {
    return [
      ['Период', dateFrom || dateTo
        ? `${dateFrom ? new Date(dateFrom).toLocaleDateString('ru-RU') : '…'} — ${dateTo ? new Date(dateTo).toLocaleDateString('ru-RU') : '…'}`
        : 'вся история'],
      ['Тип операции', filterType ? (TX_LABELS[filterType] ?? filterType) : 'все'],
      ['Пользователь', filterNick || 'все'],
    ]
  }

  async function exportAll() {
    setExporting(true)
    try {
      const { rows, total: found, truncated } = await fetchExportRows()
      downloadCsv(stampedName('журнал-транзакций'), EXPORT_HEADERS, rows.map(exportRow))
      if (truncated) toast(`Выгружено ${rows.length} из ${found} — сузьте фильтр`, 'error')
    } catch {
      toast('Не удалось выгрузить отчёт', 'error')
    } finally {
      setExporting(false)
    }
  }

  async function printAll() {
    setExporting(true)
    try {
      const { rows, total: found, truncated } = await fetchExportRows()
      const sum = (pick: (tx: TxEntry) => number) =>
        rows.reduce((s, tx) => s + pick(tx), 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      printReport({
        title: 'Журнал транзакций',
        meta: reportMeta(),
        headers: EXPORT_HEADERS,
        rows: rows.map(exportRow),
        numeric: [4, 5],
        landscape: true,
        totals: [
          ['Приход, ₽', sum(tx => INCOME_TYPES.has(tx.type) ? Number(tx.amount) || 0 : 0)],
          ['Расход, ₽', sum(tx => INCOME_TYPES.has(tx.type) ? 0 : Number(tx.amount) || 0)],
          ['Прибыль платформы, ₽', sum(tx => Number(tx.platform_profit) || 0)],
        ],
      })
      if (truncated) toast(`В отчёт попало ${rows.length} из ${found} — сузьте фильтр`, 'error')
    } catch {
      toast('Не удалось сформировать отчёт', 'error')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-ink">Журнал транзакций</h1>
        <div className="flex gap-2 no-print">
          <button onClick={exportAll} disabled={exporting} className={BTN + ' disabled:opacity-50'}>
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            CSV
          </button>
          <button onClick={printAll} disabled={exporting} className={BTN + ' disabled:opacity-50'}>
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            PDF / печать
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end no-print">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={INPUT}>
          <option value="">Все типы</option>
          {TX_TYPES.map(t => <option key={t} value={t}>{TX_LABELS[t]}</option>)}
        </select>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input type="text" placeholder="Никнейм..." value={filterNick}
            onChange={e => setFilterNick(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchLedger(1)}
            className={INPUT + ' pl-7 w-36'} />
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={INPUT} title="С даты" />
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className={INPUT} title="По дату" />
        <button onClick={() => fetchLedger(1)}
          className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors">
          Применить
        </button>
        <span className="text-xs text-subtle">Найдено: {total}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-subtle" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-subtle text-sm">Нет записей</div>
      ) : (
        <>
        {/* overflow-x-auto, а не overflow-hidden: 6 колонок не сжимаются
            в 240px и обрезались на мобильном без возможности доскроллить */}
        <div className="bg-surface rounded-xl border border-line overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-panel border-b border-line">
              <tr>
                <th className="py-2 px-3 text-left text-subtle font-medium">Пользователь</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Тип</th>
                <th className="py-2 px-3 text-right text-subtle font-medium">Сумма</th>
                <th className="py-2 px-3 text-center text-subtle font-medium">Статус</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Дата</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Заказ</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(tx => {
                const income = INCOME_TYPES.has(tx.type)
                return (
                  <tr key={tx.id} className="border-b border-line last:border-0 hover:bg-panel/50">
                    <td className="py-2 px-3 text-ink">
                      <span className="inline-flex items-center gap-1.5">
                        {tx.user?.nickname ?? '—'}
                        {tx.user?.is_vip && <VipBadge />}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-ink">{TX_LABELS[tx.type] ?? tx.type}</td>
                    <td className="py-2 px-3 text-right font-medium">
                      <span className="flex items-center justify-end gap-1">
                        {income
                          ? <Plus size={11} className="text-success" />
                          : <Minus size={11} className="text-error" />
                        }
                        <span className={income ? 'text-success' : 'text-error'}>
                          {Math.abs(tx.amount).toLocaleString('ru-RU')} ₽
                        </span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        tx.status === 'completed' ? 'bg-success/10 text-success' :
                        tx.status === 'rejected'  ? 'bg-error/10 text-error' :
                        'bg-warning/10 text-warning'
                      }`}>
                        {STATUS_LABELS[tx.status] ?? tx.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-subtle text-xs">{timeAgo(tx.created_at)}</td>
                    <td className="py-2 px-3 text-subtle text-xs font-mono">
                      {tx.order_id ? tx.order_id.slice(0, 8) + '…' : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between no-print">
            <span className="text-sm text-subtle">Страница {page} из {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => fetchLedger(page - 1)} disabled={page <= 1}
                className="p-1.5 rounded-lg border border-line hover:bg-panel disabled:opacity-40 transition-colors">
                <ChevronLeft size={16} className="text-ink" />
              </button>
              <button onClick={() => fetchLedger(page + 1)} disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-line hover:bg-panel disabled:opacity-40 transition-colors">
                <ChevronRight size={16} className="text-ink" />
              </button>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  )
}
