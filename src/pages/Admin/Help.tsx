import { useMemo } from 'react'
import { GlassCard } from '../../components/glass'
import { ADMIN_GUIDE_MD } from './adminGuideText'

// ponytail: ~90 строк вместо react-markdown — гайд использует только заголовки,
// списки, таблицы, жирный и `код`. Появится нужда в остальном markdown —
// тогда и ставить зависимость.

/** `**жирный**` + `` `код` `` внутри строки. Без вложенности — её в гайде нет. */
function inline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={`${key}-${i}`} className="text-ink font-semibold">{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`'))
      return (
        <code key={`${key}-${i}`} className="px-1 py-0.5 rounded bg-white/[.07] text-accent text-[0.9em] font-mono">
          {p.slice(1, -1)}
        </code>
      )
    return <span key={`${key}-${i}`}>{p}</span>
  })
}

const cells = (row: string) => row.replace(/^\||\|$/g, '').split('|').map(c => c.trim())

function render(md: string) {
  const lines = md.split('\n')
  const out: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim() || /^---+$/.test(line.trim())) { i++; continue }

    // Таблица: строка заголовка, строка-разделитель, дальше данные
    if (line.trim().startsWith('|') && lines[i + 1]?.includes('---')) {
      const head = cells(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]))
      out.push(
        <div key={`t${i}`} className="overflow-x-auto my-4 rounded-xl border border-line">
          <table className="w-full text-sm min-w-[420px]">
            <thead className="bg-white/[.05]">
              <tr>
                {head.map((h, c) => (
                  <th key={c} className="text-left font-medium text-subtle px-3 py-2 border-b border-line">
                    {inline(h, `th${i}-${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-line last:border-0 align-top">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-3 py-2 text-subtle">{inline(c, `td${i}-${ri}-${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // Списки: маркированный (-) и нумерованный (1.). Продолжения с отступом
    // приклеиваются к предыдущему пункту.
    const bullet = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line)
    if (bullet) {
      const ordered = /\d/.test(bullet[2])
      const items: string[] = []
      while (i < lines.length) {
        const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i])
        if (m) { items.push(m[3]); i++; continue }
        if (/^\s+\S/.test(lines[i]) && items.length) { items[items.length - 1] += ' ' + lines[i].trim(); i++; continue }
        break
      }
      const Tag = ordered ? 'ol' : 'ul'
      out.push(
        <Tag key={`l${i}`} className={`my-3 space-y-1.5 pl-5 text-subtle text-sm leading-relaxed ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((it, n) => <li key={n}>{inline(it, `li${i}-${n}`)}</li>)}
        </Tag>,
      )
      continue
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      const text = h[2]
      const depth = h[1].length
      i++
      if (depth === 1) out.push(<h1 key={`h${i}`} className="text-2xl font-bold text-ink mb-2">{text}</h1>)
      else if (depth === 2) out.push(
        <h2 key={`h${i}`} className="text-xl font-semibold text-ink mt-10 mb-3 pb-2 border-b border-line">{text}</h2>,
      )
      else out.push(<h3 key={`h${i}`} className="text-base font-semibold text-ink mt-6 mb-2">{text}</h3>)
      continue
    }

    // Абзац — до пустой строки
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^[#|]|^\s*([-*]|\d+\.)\s/.test(lines[i]) && !/^---+$/.test(lines[i].trim())) {
      para.push(lines[i].trim()); i++
    }
    if (para.length) out.push(
      <p key={`p${i}`} className="my-3 text-sm text-subtle leading-relaxed">{inline(para.join(' '), `p${i}`)}</p>,
    )
    else i++
  }

  return out
}

export default function AdminHelp() {
  const content = useMemo(() => render(ADMIN_GUIDE_MD), [])
  return (
    <GlassCard className="rounded-2xl p-5 sm:p-8 max-w-4xl">
      {content}
    </GlassCard>
  )
}
