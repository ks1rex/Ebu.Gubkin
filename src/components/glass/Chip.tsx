import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}

/** `.chip` from the glassmorphism handoff. */
export default function Chip({ children, active = false, onClick, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm font-medium px-3.5 py-2 rounded-[11px] whitespace-nowrap transition-colors duration-150 ${
        active
          ? 'text-[#1a1140] font-semibold bg-gradient-to-br from-lav to-[#ddd6fe]'
          : 'text-lav bg-white/[.07] border border-white/[.12] hover:bg-white/[.12] hover:text-ink'
      } ${className}`}
    >
      {children}
    </button>
  )
}
