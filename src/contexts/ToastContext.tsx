import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const CONF = {
  success: { Icon: CheckCircle, border: 'border-l-success', icon: 'text-success' },
  error:   { Icon: XCircle,     border: 'border-l-error',   icon: 'text-error'   },
  info:    { Icon: Info,        border: 'border-l-accent',  icon: 'text-accent'  },
} as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map(t => {
          const { Icon, border, icon } = CONF[t.type]
          return (
            <div
              key={t.id}
              className={`pointer-events-auto bg-surface border border-line border-l-4 ${border} rounded-lg px-4 py-3 shadow-lg flex items-start gap-3 animate-slide-up`}
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${icon}`} />
              <p className="text-sm text-ink flex-1">{t.message}</p>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="text-subtle hover:text-ink transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx.toast
}
