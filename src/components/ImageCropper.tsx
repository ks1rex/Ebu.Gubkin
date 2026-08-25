import { useEffect, useRef, useState } from 'react'

interface Props {
  file: File
  /** width / height */
  aspect: number
  outputWidth?: number
  onCancel: () => void
  onConfirm: (file: File) => void
}

// Перетаскивание картинки внутри рамки фиксированного соотношения сторон —
// object-cover сам решает, что обрезать, а тут решает пользователь. Только
// пан (без зума): решает жалобу "обрезает как хочет" минимальным способом.
export default function ImageCropper({ file, aspect, outputWidth = 1200, onCancel, onConfirm }: Props) {
  const [imgUrl, setImgUrl] = useState('')
  const [img,    setImg]    = useState<HTMLImageElement | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale,  setScale]  = useState(1)
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef  = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    const image = new Image()
    image.onload = () => setImg(image)
    image.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!img || !frameRef.current) return
    const rect = frameRef.current.getBoundingClientRect()
    const s = Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight)
    setScale(s)
    setOffset({ x: (rect.width - img.naturalWidth * s) / 2, y: (rect.height - img.naturalHeight * s) / 2 })
  }, [img])

  function clamp(o: { x: number; y: number }) {
    if (!img || !frameRef.current) return o
    const rect = frameRef.current.getBoundingClientRect()
    const dispW = img.naturalWidth * scale
    const dispH = img.naturalHeight * scale
    return {
      x: Math.min(0, Math.max(rect.width - dispW, o.x)),
      y: Math.min(0, Math.max(rect.height - dispH, o.y)),
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const { startX, startY, origX, origY } = dragRef.current
    setOffset(clamp({ x: origX + (e.clientX - startX), y: origY + (e.clientY - startY) }))
  }
  function onPointerUp() { dragRef.current = null }

  async function handleConfirm() {
    if (!img || !frameRef.current) return
    const rect = frameRef.current.getBoundingClientRect()
    const outH = Math.round(outputWidth / aspect)
    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(
      img,
      -offset.x / scale, -offset.y / scale, rect.width / scale, rect.height / scale,
      0, 0, outputWidth, outH,
    )
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', 0.85))
    if (!blob) return
    onConfirm(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }))
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-canvas border border-white/[.14] rounded-[20px] p-5 max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-ink mb-3">Выберите видимую область</h3>
        <div
          ref={frameRef}
          className="relative w-full overflow-hidden rounded-[12px] bg-black/40 touch-none cursor-grab active:cursor-grabbing select-none"
          style={{ aspectRatio: String(aspect) }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {imgUrl && img && (
            <img
              src={imgUrl}
              draggable={false}
              alt=""
              className="absolute pointer-events-none max-w-none"
              style={{ left: offset.x, top: offset.y, width: img.naturalWidth * scale, height: img.naturalHeight * scale }}
            />
          )}
        </div>
        <p className="text-xs text-subtle mt-2">Перетащите картинку, чтобы выбрать видимую область</p>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onCancel} className="px-4 py-1.5 text-sm border border-line rounded-md text-ink hover:bg-panel transition-colors">Отмена</button>
          <button onClick={handleConfirm} className="px-4 py-1.5 text-sm bg-accent text-white rounded-md hover:bg-accent-hover transition-colors">Готово</button>
        </div>
      </div>
    </div>
  )
}
