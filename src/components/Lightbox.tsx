import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// Полноэкранный просмотр картинки без открытия прямой (для чата — ещё и
// подписанной) ссылки в новой вкладке.
export default function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
        <X size={18} />
      </button>
      <img src={url} alt="" onClick={e => e.stopPropagation()} className="max-w-full max-h-full rounded-[14px] object-contain" />
    </div>,
    document.body,
  )
}
