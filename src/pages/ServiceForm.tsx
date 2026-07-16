import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { formatCurrency } from '../lib/format'
import { apiCall } from '../lib/api'

const CLS = {
  input: 'w-full bg-[#0f1923] border border-[#1e3a4a] rounded-lg py-[10px] px-3 text-slate-200 text-[0.93rem] box-border',
  label: 'block text-slate-400 text-[0.82rem] mb-1.5',
}

interface Props {
  initial?: any
  onSubmit: (data: any) => void
  loading: boolean
  error: string
  errorCode?: string
  title: string
  cancelTo?: string
}

export default function ServiceForm({ initial = {}, onSubmit, loading, error, errorCode, title, cancelTo = '/services/mine' }: Props) {
  const [formTitle, setFormTitle] = useState(initial.title ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [price, setPrice] = useState(initial.price ?? '')
  const [hasDeposit, setHasDeposit] = useState(parseFloat(initial.deposit_amount ?? 0) > 0)
  const [depositAmt, setDepositAmt] = useState(initial.deposit_amount ?? '')
  const [category, setCategory] = useState(initial.category ?? '')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    apiCall('GET', '/listings/categories')
      .then(data => setCategories(Array.isArray(data?.categories) ? data.categories.map((c: any) => typeof c === 'string' ? c : c.name) : []))
      .catch(() => {})
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      title: formTitle, description,
      price: parseFloat(String(price)),
      deposit_amount: hasDeposit ? parseFloat(String(depositAmt) || '0') : 0,
      category: category || undefined,
    })
  }

  const amt = parseFloat(String(price)) || 0
  const dep = hasDeposit ? (parseFloat(String(depositAmt)) || 0) : 0

  return (
    <div className="max-w-[680px] mx-auto">
      <div className="text-slate-200 text-[1.3rem] font-bold mb-6">{title}</div>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="text-red-400 bg-[#2d1515] rounded-md py-[10px] px-3.5 mb-4 flex items-center gap-2 text-[0.88rem]">
            <AlertCircle size={16} />
            <span>
              {error}
              {errorCode === 'LISTING_LIMIT_REACHED' && <> · <Link to="/wallet" className="text-teal-legacy">Купите VIP — до 10 объявлений</Link></>}
            </span>
          </div>
        )}

        <div className="mb-5">
          <label className={CLS.label}>Заголовок услуги</label>
          <input className={CLS.input} value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Например: Репетиторство по математике (ЕГЭ)" maxLength={200} required />
        </div>

        <div className="mb-5">
          <label className={CLS.label}>Описание</label>
          <textarea className={`${CLS.input} min-h-[120px] resize-y font-[inherit]`} value={description} onChange={e => setDescription(e.target.value)} placeholder="Опишите услугу, условия работы, что включено..." required />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className={CLS.label}>Цена, ₽</label>
            <input className={CLS.input} type="number" min="1" step="1" value={price} onChange={e => setPrice(e.target.value)} placeholder="1500" required />
          </div>
          <div>
            <label className={CLS.label}>Стоимость{dep > 0 ? ` + залог = ${formatCurrency(amt + dep)}` : ''}</label>
            <div className="text-slate-500 text-[0.82rem] pt-2.5">{amt > 0 ? formatCurrency(amt) : '—'}</div>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mb-5">
            <label className={CLS.label}>Категория</label>
            <select className={CLS.input} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Не выбрана</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <div className="mb-5">
          <div className="flex items-start gap-2.5 mb-2">
            <input id="hasDeposit" type="checkbox" className="w-[18px] h-[18px] mt-0.5 accent-teal-legacy shrink-0" checked={hasDeposit} onChange={e => setHasDeposit(e.target.checked)} />
            <div>
              <label htmlFor="hasDeposit" className="text-slate-200 text-[0.9rem] cursor-pointer">Требуется залог</label>
              <div className="text-slate-500 text-[0.76rem] mt-[3px]">Залог возвращается заказчику после успешного завершения, или переходит исполнителю при споре</div>
            </div>
          </div>
          {hasDeposit && (
            <div className="mt-2 pl-7">
              <label className={CLS.label}>Сумма залога, ₽</label>
              <input className={`${CLS.input} max-w-[200px]`} type="number" min="1" step="1" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} placeholder="500" required={hasDeposit} />
            </div>
          )}
        </div>

        <div className="flex items-center">
          <button className="bg-teal-legacy text-white rounded-lg py-[11px] px-7 text-base font-semibold cursor-pointer" type="submit" disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</button>
          <Link to={cancelTo} className="text-slate-500 text-[0.85rem] ml-4 no-underline">Отмена</Link>
        </div>
      </form>
    </div>
  )
}
