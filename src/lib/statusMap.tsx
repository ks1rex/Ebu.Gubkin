const LABELS: Record<string, string> = {
  open:                  'Открыт для заявок',
  awaiting_topup:        'Ожидает доплаты',
  assigned:              'Исполнитель выбран',
  in_progress:           'В работе',
  awaiting_confirmation: 'Ожидает подтверждения',
  completed:             'Завершён',
  disputed:              'Спор',
  cancelled:             'Отменён (возврат)',
}

const COLORS: Record<string, string> = {
  open:                  '#7c3aed', // ponytail: accent.DEFAULT from tailwind.config.ts — no shared CSS var yet
  awaiting_topup:        '#f59e0b',
  assigned:              '#6366f1',
  in_progress:           '#3b82f6',
  awaiting_confirmation: '#a855f7',
  completed:             '#22c55e',
  disputed:              '#ef4444',
  cancelled:             '#64748b',
}

export function getStatusLabel(status: string): string {
  return LABELS[status] ?? status
}

export function getStatusColor(status: string): string {
  return COLORS[status] ?? '#64748b'
}

export function StatusBadge({ status }: { status: string }) {
  const color = getStatusColor(status)
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: '0.78rem',
      fontWeight: 600,
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
    }}>
      {getStatusLabel(status)}
    </span>
  )
}
