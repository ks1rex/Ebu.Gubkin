import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import Modal from './Modal'

export function useGostFrozenModal() {
  const [open, setOpen] = useState(false)
  // Navbar/Home живут вне Routes и не размонтируются при навигации — закрываем вручную.
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false) }, [pathname])
  // Портал в body: у <header> в Navbar есть backdrop-filter, а он создаёт
  // containing block для position:fixed — без портала модалка клипается по шапке.
  const modal = createPortal(
    <Modal open={open} onClose={() => setOpen(false)} title="ГОСТ-калькулятор">
      <p className="text-sm text-subtle leading-relaxed">В разработке</p>
    </Modal>,
    document.body,
  )
  return { openGostFrozenModal: () => setOpen(true), gostFrozenModal: modal }
}
