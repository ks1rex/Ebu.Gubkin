import { useState } from 'react'
import Modal from './Modal'

export function useGostFrozenModal() {
  const [open, setOpen] = useState(false)
  const modal = (
    <Modal open={open} onClose={() => setOpen(false)} title="ГОСТ-калькулятор">
      <p className="text-sm text-subtle leading-relaxed">В разработке</p>
    </Modal>
  )
  return { openGostFrozenModal: () => setOpen(true), gostFrozenModal: modal }
}
