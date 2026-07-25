import { useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-md' }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    // Фон не должен скроллиться под открытой модалкой — на мобильном иначе
    // «уезжает» страница вместо контента модалки.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  // Портал в body обязателен: bg-surface/bg-panel по всему сайту получают
  // backdrop-filter (см. index.css), а он создаёт containing block для
  // position:fixed — модалка внутри любой стеклянной карточки/шапки иначе
  // клипается по её границам вместо вьюпорта.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="absolute inset-0 bg-canvas/45 backdrop-blur-[8px] backdrop-brightness-[.7]"
        onClick={onClose}
      />
      <div className={`relative bg-panel border border-line rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90dvh] overflow-y-auto animate-modal-in`}>
        <div className="flex items-center justify-between pl-6 pr-3 py-3 border-b border-line sticky top-0 bg-panel rounded-t-xl">
          <h2 className="font-semibold text-ink min-w-0 break-words">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-md text-subtle hover:text-ink hover:bg-panel transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
