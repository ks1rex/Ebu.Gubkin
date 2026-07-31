import { useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GlassCard } from '../components/glass'
import { renderMarkdown } from '../lib/markdown'

// Тексты лежат обычными .md-файлами (src/legal/) и подключаются как строки —
// править их можно, не трогая код.
import privacyMd     from '../legal/privacy.md?raw'
import pdnConsentMd  from '../legal/pdn-consent.md?raw'
import termsMd       from '../legal/terms.md?raw'
import offerMd       from '../legal/offer.md?raw'
import marketRulesMd from '../legal/market-rules.md?raw'

export type LegalDoc = 'privacy' | 'pdn-consent' | 'terms' | 'offer' | 'market-rules'

export const LEGAL_DOCS: { slug: LegalDoc; title: string; md: string }[] = [
  { slug: 'privacy',      title: 'Политика конфиденциальности',        md: privacyMd },
  { slug: 'pdn-consent',  title: 'Согласие на обработку персональных данных', md: pdnConsentMd },
  { slug: 'terms',        title: 'Пользовательское соглашение',        md: termsMd },
  { slug: 'offer',        title: 'Публичная оферта',                   md: offerMd },
  { slug: 'market-rules', title: 'Правила биржи',                      md: marketRulesMd },
]

export default function Legal({ doc }: { doc: LegalDoc }) {
  const current = LEGAL_DOCS.find(d => d.slug === doc)!
  const content = useMemo(() => renderMarkdown(current.md), [current.md])

  // Документы длинные: при переходе между ними с середины страницы
  // пользователь иначе оказывается в середине следующего.
  useEffect(() => { window.scrollTo(0, 0) }, [doc])

  return (
    <div className="max-w-4xl mx-auto pb-4">
      <nav className="flex flex-wrap gap-2 mb-4">
        {LEGAL_DOCS.map(d => (
          <Link
            key={d.slug}
            to={`/${d.slug}`}
            className={`px-3 py-1.5 rounded-lg text-[13px] border transition-colors ${
              d.slug === doc
                ? 'border-accent bg-accent/15 text-ink'
                : 'border-line text-subtle hover:text-ink'
            }`}
          >
            {d.title}
          </Link>
        ))}
      </nav>

      <GlassCard className="rounded-2xl p-5 sm:p-8">
        {content}
      </GlassCard>
    </div>
  )
}
