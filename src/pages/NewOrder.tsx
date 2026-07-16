import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Upload, X, Eye, Lock, AlertCircle } from 'lucide-react'
import { apiCall } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../lib/format'

const CLS = {
  label: 'block text-slate-400 text-[0.82rem] mb-1.5',
  input: 'w-full bg-[#0f1923] border border-[#1e3a4a] rounded-lg py-[10px] px-3 text-slate-200 text-[0.95rem] box-border',
  dropzone: (over: boolean) =>
    `border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-150 mb-4 ${
      over ? 'border-teal-legacy bg-[#0d2620]' : 'border-[#1e3a4a] bg-transparent'
    }`,
  toggleVisBtn: (isPublic: boolean) =>
    `flex items-center gap-[5px] py-1 px-2.5 rounded-md border text-[0.78rem] cursor-pointer bg-transparent ${
      isPublic ? 'border-teal-legacy-hover text-teal-legacy' : 'border-slate-700 text-slate-500'
    }`,
}

interface FileItem { id: string; file: File; visibility: 'public' | 'after_assignment' }

export default function NewOrder() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject]   = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    apiCall('GET', '/listings/categories')
      .then(data => setCategories(Array.isArray(data?.categories) ? data.categories.map((c: any) => typeof c === 'string' ? c : c.name) : []))
      .catch(() => {})
  }, [])
  const [baseAmount, setBaseAmount] = useState('')
  const [files, setFiles]       = useState<FileItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [error, setError]       = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [loading, setLoading]   = useState(false)

  const amount = parseFloat(baseAmount) || 0
  const balance = parseFloat(String(profile?.balance ?? 0))
  const insufficient = amount > 0 && balance < amount

  function addFiles(fileList: FileList | null) {
    if (!fileList) return
    const next = Array.from(fileList).map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      visibility: 'public' as const,
    }))
    setFiles(prev => [...prev, ...next])
  }

  function toggleVisibility(id: string) {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, visibility: f.visibility === 'public' ? 'after_assignment' : 'public' } : f
    ))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setErrorCode('')
    if (!title.trim()) return setError('Введите заголовок')
    if (!description.trim()) return setError('Введите описание')
    if (!subject.trim()) return setError('Введите предмет')
    if (amount <= 0) return setError('Введите корректную сумму')
    setLoading(true)
    try {
      const order = await apiCall('POST', '/orders', {
        title: title.trim(), description: description.trim(), subject: subject.trim(),
        order_type: 'order', base_amount: amount, category: category || undefined,
      })
      for (const { file, visibility } of files) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('visibility', visibility)
        await apiCall('POST', `/orders/${order.id}/attachments`, fd)
      }
      navigate(`/market/orders/${order.id}`)
    } catch (err: any) {
      setErrorCode(err.data?.code ?? '')
      if (err.data?.error === 'insufficient_balance') {
        setError(`Недостаточно средств. Нужно ${formatCurrency(err.data.required)}, на балансе ${formatCurrency(err.data.balance)}.`)
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="text-slate-200 text-[1.4rem] font-bold mb-6">Новый заказ</div>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="text-red-400 bg-[#2d1515] rounded-md py-[10px] px-3.5 mb-4 flex items-center gap-2 text-[0.88rem]">
            <AlertCircle size={16} />
            <span>
              {error}
              {error.includes('заблокирован') && <> · <Link to="/support" className="text-teal-legacy">Написать в поддержку</Link></>}
              {error.includes('средств') && <> · <Link to="/wallet" className="text-teal-legacy">Пополнить кошелёк</Link></>}
              {errorCode === 'LISTING_LIMIT_REACHED' && <> · <Link to="/wallet" className="text-teal-legacy">Купите VIP — до 10 объявлений</Link></>}
            </span>
          </div>
        )}

        <div className="mb-6">
          <label className={CLS.label}>Заголовок заказа</label>
          <input className={CLS.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Например: Помогите с курсовой по маркетингу" maxLength={120} />
        </div>

        <div className="mb-6">
          <label className={CLS.label}>Описание / требования</label>
          <textarea className={`${CLS.input} min-h-[110px] resize-y font-[inherit]`} value={description} onChange={e => setDescription(e.target.value)} placeholder="Подробно опишите задание, требования, формат сдачи..." />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className={CLS.label}>Предмет / дисциплина</label>
            <input className={CLS.input} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Маркетинг, Математика, Физика..." />
          </div>
          <div>
            <label className={CLS.label}>Ваш бюджет, ₽</label>
            <input className={CLS.input} type="number" min="1" step="1" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} placeholder="500" />
            <div className="text-slate-500 text-[0.76rem] mt-1">Исполнитель может предложить другую цену</div>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mb-6">
            <label className={CLS.label}>Категория</label>
            <select className={CLS.input} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Не выбрана</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {amount > 0 && (
          <div className={`rounded-lg py-[14px] px-4 mb-6 border ${insufficient ? 'bg-[#1f0808] border-[#ef4444]' : 'bg-[#0d2620] border-teal-legacy-hover'}`}>
            <div className="text-slate-500 text-[0.78rem] mb-1.5">Сумма заказа — списывается с вашего баланса</div>
            <div className={`text-[1.3rem] font-bold ${insufficient ? 'text-red-400' : 'text-teal-legacy'}`}>{formatCurrency(amount)}</div>
            <div className={`mt-2 text-[0.82rem] ${insufficient ? 'text-red-400' : 'text-slate-500'}`}>
              Ваш баланс: {formatCurrency(balance)}
              {insufficient && <> — недостаточно средств. <Link to="/wallet" className="text-teal-legacy">Пополнить кошелёк</Link></>}
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className={CLS.label}>Файлы (необязательно)</label>
          <div className={CLS.dropzone(dragOver)} onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }} onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onClick={() => fileInputRef.current?.click()}>
            <Upload size={24} className="text-teal-legacy mb-2" />
            <div className="text-slate-400 mb-1">Перетащите файлы сюда или нажмите</div>
            <div className="text-slate-500 text-[0.78rem]">Максимум 10 МБ на файл</div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
          </div>
          {files.map(({ id, file, visibility }) => (
            <div key={id} className="bg-[#0f1923] border border-[#1e3a4a] rounded-lg py-[10px] px-3 mb-1.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 text-[0.88rem] overflow-hidden text-ellipsis whitespace-nowrap">{file.name}</div>
                <div className="text-slate-500 text-xs">{(file.size / 1024).toFixed(0)} КБ</div>
              </div>
              <button type="button" className={CLS.toggleVisBtn(visibility === 'public')} onClick={() => toggleVisibility(id)}>
                {visibility === 'public' ? <Eye size={13} /> : <Lock size={13} />}
                {visibility === 'public' ? 'Видно всем' : 'После выбора'}
              </button>
              <button type="button" className="bg-transparent border-none text-slate-500 cursor-pointer flex items-center" onClick={() => setFiles(prev => prev.filter(f => f.id !== id))}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <button
          className={`bg-teal-legacy text-white rounded-lg py-[11px] px-7 text-base font-semibold ${(insufficient || loading) ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer'}`}
          type="submit" disabled={loading || insufficient}>
          {loading ? 'Создание заказа...' : 'Разместить заказ'}
        </button>
      </form>
    </div>
  )
}
