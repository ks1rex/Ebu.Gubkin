import { useState } from 'react'
import { FileText, X } from 'lucide-react'
import { Attachment, isImage } from '../../lib/attachments'
import Lightbox from '../Lightbox'

export default function AttachmentList({ attachments, onRemove }: { attachments: Attachment[]; onRemove?: (url: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null)
  if (attachments.length === 0) return null
  const images = attachments.filter(isImage)
  const files  = attachments.filter(a => !isImage(a))

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map(a => (
            <div key={a.url} className="relative">
              <button type="button" onClick={() => setPreview(a.url)}>
                <img src={a.url} alt={a.name} loading="lazy" decoding="async" className="w-[92px] h-[92px] object-cover rounded-[12px] border border-white/[.12]" />
              </button>
              {onRemove && (
                <button type="button" onClick={() => onRemove(a.url)}
                  className="absolute -top-1.5 -right-1.5 w-[20px] h-[20px] rounded-full bg-canvas border border-white/20 text-subtle flex items-center justify-center">
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map(a => (
            <div key={a.url} className="flex items-center gap-2 text-[13px]">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-lav hover:underline truncate">
                <FileText size={14} className="shrink-0" /> {a.name}
              </a>
              {onRemove && (
                <button type="button" onClick={() => onRemove(a.url)} className="text-subtle hover:text-error shrink-0"><X size={13} /></button>
              )}
            </div>
          ))}
        </div>
      )}
      {preview && <Lightbox url={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
