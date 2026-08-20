import { useMemo } from 'react'
import { GlassCard } from '../../components/glass'
import { renderMarkdown } from '../../lib/markdown'
import { ADMIN_GUIDE_MD } from './adminGuideText'
import { useAdminView } from '../../contexts/AdminViewContext'
import { NAV_ITEMS } from './index'

// Рендерер общий с юридическими страницами — см. src/lib/markdown.tsx.

// Подразделы под "## Разделы админки" называются точно так же, как пункты
// меню (см. ADMIN_GUIDE.md) — оставляем только те, что доступны тарифу «админ».
const ALLOWED_SECTION_LABELS = new Set(NAV_ITEMS.filter(i => !i.ownerOnly).map(i => i.label))

// Верхнеуровневые "## "-блоки, которые вообще имеет смысл показывать админу.
// «VIP-система», «Финансовая логика», «Частые вопросы» и «Важные правила» —
// не заголовочные списки/списки-пункты вперемешку про owner-only разделы
// (Финансы, Пополнения, Выводы, Прогрев расписания, ГОСТ и т.д.), почистить
// их построчно надёжно нельзя — проще не показывать целиком, чем частично
// деанонить владельческую механику через щели фильтра.
const ALLOWED_H2 = new Set(['Доступ в админку', 'Разделы админки', 'Юридические документы'])

/**
 * Урезает гайд для тарифа «админ»: оставляет только разрешённые "## "-блоки
 * (см. ALLOWED_H2), а внутри "## Разделы админки" — только "###"-подразделы
 * из разрешённого набора (Финансы, VIP, ГОСТ-шаблоны и т.д. выкидываются),
 * включая «Настройки» — её owner-only части (реквизиты, параметры платформы,
 * категории форума) админу не актуальны, а про 2FA уже сказано в разделе
 * «Доступ в админку» выше по тексту.
 */
function filterForAdminTier(md: string): string {
  const blocks = md.split(/\n(?=## )/)
  const preamble = blocks[0] // заголовок документа + вступление, до первого "## "

  const kept = blocks.slice(1).filter(block => {
    const title = block.match(/^## (.+)$/m)?.[1]?.trim()
    return title != null && ALLOWED_H2.has(title)
  }).map(block => {
    if (!block.startsWith('## Разделы админки')) return block

    const parts = block.split(/\n(?=### )/)
    const header = parts[0]
    const keptSubsections = parts.slice(1).filter(part => {
      const title = part.match(/^### (.+)$/m)?.[1]?.trim()
      return title === 'Настройки' ? false : title != null && ALLOWED_SECTION_LABELS.has(title)
    })
    return header + keptSubsections.join('')
  })

  return preamble + kept.join('')
}

export default function AdminHelp() {
  const { effectiveIsOwner } = useAdminView()
  const md = effectiveIsOwner ? ADMIN_GUIDE_MD : filterForAdminTier(ADMIN_GUIDE_MD)
  const content = useMemo(() => renderMarkdown(md), [md])
  return (
    <GlassCard className="rounded-2xl p-5 sm:p-8 max-w-4xl">
      {content}
    </GlassCard>
  )
}
