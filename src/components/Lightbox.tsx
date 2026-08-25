import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// Полноэкранный просмотр картинки без открытия прямой (для чата — ещё и
// подписанной) ссылки в новой вкладке.
//
// Картинка раньше растягивалась в max-w-full/max-h-full — на телефоне это
// заходило под системные жесты/шторку сверху и кнопку закрытия было не
// нажать. Теперь у картинки явный отступ сверху под кнопку (никогда с ней
// не пересекается), а не просто "кнопка поверх картинки" на честном слове
// z-index/stacking-порядка.
export default function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex flex-col items-center"
      style={{ paddingTop: 'max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem))', paddingBottom: '1.5rem', paddingLeft: '1rem', paddingRight: '1rem' }}
    >
      <button
        onClick={onClose}
        aria-label="Закрыть"
        className="fixed w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center"
        style={{ top: 'max(1rem, env(safe-area-inset-top))', right: '1rem' }}
      >
        <X size={20} />
      </button>
      <img src={url} alt="" onClick={e => e.stopPropagation()} className="max-w-full max-h-full rounded-[14px] object-contain" />
    </div>,
    document.body,
  )
}
