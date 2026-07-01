import { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'pri' | 'mint' | 'ghost'

const VARIANT: Record<Variant, string> = {
  pri:   'text-[#1a1140] bg-gradient-to-br from-white to-[#e9e4ff] shadow-[0_10px_26px_rgba(0,0,0,.28)]',
  mint:  'text-[#08221c] bg-gradient-to-br from-mint to-[#a7f3d0] shadow-[0_8px_20px_rgba(94,234,212,.3)]',
  ghost: 'text-ink bg-white/[.08] border border-white/[.16]',
}

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {
  variant?: Variant
  children: ReactNode
  className?: string
  to?: undefined
}

interface LinkProps {
  variant?: Variant
  children: ReactNode
  className?: string
  to: string
}

/** `.btn` from the glassmorphism handoff. Pass `to` for a Link, otherwise renders a <button>. */
export default function Button({ variant = 'ghost', children, className = '', to, ...rest }: ButtonProps | LinkProps) {
  const cls = `inline-flex items-center gap-2 font-semibold text-sm rounded-[13px] px-5 py-3 whitespace-nowrap ${VARIANT[variant]} ${className}`
  if (to) return <Link to={to} className={cls}>{children}</Link>
  return <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>
}
