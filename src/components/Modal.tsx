import { useEffect, ReactNode } from 'react'
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
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-surface border border-line rounded-xl shadow-xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-slide-up`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line sticky top-0 bg-surface rounded-t-xl">
          <h2 className="font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-subtle hover:text-ink hover:bg-panel transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
