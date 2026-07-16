import { Crown } from 'lucide-react'

/**
 * VIP visual language, shared across the whole site (profile, market cards,
 * chat, forum): the same violet→pink gradient used for the homepage hero
 * text (`from-accent to-pink`, see Home.tsx) and the "Курсач по ГОСТ"
 * card tint. Works as plain Tailwind classes, so it renders correctly
 * regardless of whether the host page uses Tailwind or inline `style={}`.
 */
export function VipBadge({ size = 'sm', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  const sm = size === 'sm'
  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 font-bold rounded-full text-white bg-gradient-to-r from-accent to-pink shadow-[0_2px_8px_rgba(124,58,237,.5)] ${sm ? 'text-[10px] px-1.5 py-[1px]' : 'text-xs px-2 py-0.5'} ${className}`}
    >
      <Crown size={sm ? 9 : 11} fill="currentColor" />
      VIP
    </span>
  )
}

interface VipNameProps {
  name: string | null | undefined
  isVip?: boolean
  className?: string
  badge?: boolean
  badgeSize?: 'sm' | 'md'
}

/**
 * Single place that decides how a nickname renders when its owner is VIP:
 * gradient text + adjacent badge. Use this everywhere a nickname is shown
 * instead of duplicating the `isVip` check ad hoc — this is what keeps every
 * render site (profile, market/catalog cards, chat, forum) in sync.
 */
export default function VipName({ name, isVip, className = '', badge = true, badgeSize = 'sm' }: VipNameProps) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className={isVip ? `bg-gradient-to-r from-accent to-pink bg-clip-text text-transparent font-semibold ${className}` : className}>
        {name}
      </span>
      {isVip && badge && <VipBadge size={badgeSize} />}
    </span>
  )
}
