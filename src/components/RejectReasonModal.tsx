import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (comment: string) => Promise<void> | void
  title?: string
  hint?: string
  busy?: boolean
}

/**
 * Причина отклонения заявки. Бэкенд принимал `admin_comment` на
 * /admin/deposits/:id/reject и /admin/withdrawals/:id/reject с самого начала, а
 * пользователь видит этот текст в кошельке — но админка его не отправляла, и
 * человек получал отказ без объяснения. Один компонент на оба места.
 */
export default function RejectReasonModal({
  open, onClose, onConfirm, busy = false,
  title = 'Отклонить заявку',
  hint = 'Комментарий увидит пользователь в своём кошельке.',
}: Props) {
  const [comment, setComment] = useState('')

  async function submit() {
    await onConfirm(comment.trim())
    setComment('')
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-subtle mb-1">Причина отклонения</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 500))}
            rows={4}
            autoFocus
            placeholder="Например: перевод не найден, проверьте сумму и дату"
            className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:border-accent resize-none"
          />
          <p className="text-xs text-subtle mt-1">{hint} {comment.length}/500</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-line rounded-lg hover:bg-panel text-ink transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-error text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Отклонить
          </button>
        </div>
      </div>
    </Modal>
  )
}
