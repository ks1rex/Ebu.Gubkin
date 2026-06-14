import { Inbox } from 'lucide-react'
import { ReactNode, ElementType } from 'react'

interface Props {
  icon?: ElementType
  title?: string
  subtitle?: string
  action?: ReactNode
  children?: ReactNode
}

export default function EmptyState({ icon: Icon = Inbox, title, subtitle, action, children }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: 12, color: '#64748b', textAlign: 'center' }}>
      <Icon size={40} style={{ color: '#334155' }} />
      {title && <div style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8' }}>{title}</div>}
      {subtitle && <div style={{ fontSize: '0.85rem', maxWidth: 320, lineHeight: 1.6 }}>{subtitle}</div>}
      {children && <div style={{ fontSize: '0.85rem', maxWidth: 320, lineHeight: 1.6 }}>{children}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}
