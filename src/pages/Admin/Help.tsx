import { useMemo } from 'react'
import { GlassCard } from '../../components/glass'
import { renderMarkdown } from '../../lib/markdown'
import { ADMIN_GUIDE_MD } from './adminGuideText'

// Рендерер общий с юридическими страницами — см. src/lib/markdown.tsx.

export default function AdminHelp() {
  const content = useMemo(() => renderMarkdown(ADMIN_GUIDE_MD), [])
  return (
    <GlassCard className="rounded-2xl p-5 sm:p-8 max-w-4xl">
      {content}
    </GlassCard>
  )
}
