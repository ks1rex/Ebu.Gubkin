import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Modal from './Modal'

export function useGostFrozenModal() {
  const [open, setOpen] = useState(false)
  // Navbar/Home живут вне Routes и не размонтируются при навигации — закрываем вручную.
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false) }, [pathname])
  const modal = (
    <Modal open={open} onClose={() => setOpen(false)} title="ГОСТ-калькулятор">
      <p className="text-sm text-subtle leading-relaxed">В разработке</p>
    </Modal>
  )
  return { openGostFrozenModal: () => setOpen(true), gostFrozenModal: modal }
}
