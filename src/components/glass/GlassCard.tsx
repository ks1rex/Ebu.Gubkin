import { HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
}

/** `.glass` surface from the glassmorphism handoff — translucent, blurred, soft shadow. */
export default function GlassCard({ children, hover = false, className = '', ...rest }: Props) {
  return (
    <div
      className={`bg-surface border border-line backdrop-blur-glass shadow-[0_18px_50px_rgba(20,8,50,.45),inset_0_1px_0_rgba(255,255,255,.18)] ${
        hover ? 'transition-all duration-150 hover:bg-panel hover:-translate-y-0.5 cursor-pointer' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
