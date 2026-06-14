import { useState, useRef } from 'react'
import { FileText, Upload, Download } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const GOST = import.meta.env.VITE_GOST_URL as string

export default function GostFormat() {
  const { session } = useAuth()
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file)  { toast('Выберите файл .docx', 'error'); return }
    if (!GOST)  { toast('ГОСТ-сервис не настроен (VITE_GOST_URL)', 'error'); return }

    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${GOST}/format-gost`, {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Ошибка форматирования' }))
        toast(err.error ?? 'Ошибка форматирования', 'error')
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get('content-disposition') ?? ''
      const fn = cd.match(/filename[^;=\n]*=["']?([^"'\n;]+)/)?.[1]
             ?? file.name.replace(/(\.[^.]+)$/, '_гост$1')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = fn; a.click()
      URL.revokeObjectURL(url)
      toast('Документ отформатирован!', 'success')
    } catch {
      toast('Сетевая ошибка', 'error')
    } finally {
      setLoading(false)
    }
  }

  const S: Record<string, any> = {
    title:    { color: '#e2e8f0', fontSize: '1.4rem', fontWeight: 700 },
    subtitle: { color: '#94a3b8', fontSize: '0.88rem', marginTop: 4, marginBottom: 28 },
    label:    { color: '#e2e8f0', fontSize: '0.88rem', fontWeight: 500, marginBottom: 8, display: 'block' },
    dropzone: (has: boolean) => ({
      border: `2px dashed ${has ? '#14a89a55' : '#1e3a4a'}`,
      borderRadius: 12, padding: '28px 16px', textAlign: 'center', cursor: 'pointer',
      background: has ? 'rgba(20,168,154,0.05)' : 'transparent',
      transition: 'border-color 0.15s',
    }),
    hint: { color: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 10, padding: '14px 16px', background: '#0f1923' },
    btnText: { color: '#64748b', fontSize: '0.75rem', marginTop: 4, display: 'inline-block' },
    submitBtn: (disabled: boolean) => ({
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      width: '100%', padding: '12px 24px', borderRadius: 10, border: 'none',
      background: disabled ? '#1e3a4a' : '#14a89a',
      color: disabled ? '#64748b' : '#fff',
      fontWeight: 600, fontSize: '0.9rem',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background 0.15s',
    }),
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <FileText size={22} style={{ color: '#14a89a' }} />
        <h1 style={S.title}>Форматирование по ГОСТ</h1>
      </div>
      <p style={S.subtitle}>
        Загрузите .docx файл — сервис применит стили ГОСТ (Times New Roman 14, 1.5 интервал, отступы)
        и вернёт отформатированный документ.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={S.label}>Документ Word (.docx)</label>
          <div onClick={() => inputRef.current?.click()} style={S.dropzone(!!file)}>
            <Upload size={22} style={{ color: '#64748b', margin: '0 auto 8px', display: 'block' }} />
            {file ? (
              <p style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{file.name}</p>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Нажмите, чтобы выбрать файл</p>
            )}
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 4 }}>DOCX</p>
            <input ref={inputRef} type="file" accept=".docx" style={{ display: 'none' }}
              onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
          {file && (
            <button type="button" onClick={() => setFile(null)}
              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.78rem', marginTop: 4, padding: 0 }}>
              Убрать файл
            </button>
          )}
        </div>

        {file && (
          <div style={{ background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: 6 }}>Будут применены стили ГОСТ Р 7.0.5:</p>
            <ul style={{ color: '#64748b', fontSize: '0.78rem', paddingLeft: 16, margin: 0, lineHeight: 1.9 }}>
              <li>Times New Roman 14pt, выравнивание по ширине</li>
              <li>Отступ первой строки 1.25 см</li>
              <li>Межстрочный интервал 1.5</li>
              <li>Поля: левое 3 см, правое 1.5 см, верхнее и нижнее 2 см</li>
            </ul>
          </div>
        )}

        <button type="submit" disabled={loading || !file} style={S.submitBtn(loading || !file)}>
          {loading ? 'Форматирование...' : <><Download size={16} />Форматировать и скачать</>}
        </button>
      </form>
    </div>
  )
}
