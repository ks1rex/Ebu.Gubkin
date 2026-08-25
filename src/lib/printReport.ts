// Печать отчётов админки собственной вёрсткой.
//
// Раньше кнопка «PDF / печать» вызывала window.print() на живой странице: в
// файл уходило то, что видно на экране (текущая страница таблицы, интерфейсные
// кнопки, тёмная тема) и без шапки отчёта. Здесь строится отдельный документ —
// шапка, параметры выборки, полная таблица, итоги — и печатается он.
//
// ponytail: документ печатает браузер (скрытый iframe + window.print()), своей
// генерации PDF нет. jsPDF/pdfmake для кириллицы требуют вшить TTF-шрифт
// (~300 КБ–1,5 МБ base64) и разложить таблицу по страницам руками; браузер
// делает это сам, включая повтор шапки таблицы на каждой странице. Заводить
// библиотеку стоит, только если понадобится PDF без участия человека
// (например, отчёт по расписанию на сервере).

import type { ReportRow } from './reportData'

export interface ReportSpec {
  /** Заголовок отчёта: «Журнал транзакций» */
  title: string
  /** Параметры выборки: [['Период', '01.01 — 31.01'], ['Тип', 'Пополнение']] */
  meta?: [string, string][]
  headers: string[]
  rows: ReportRow[]
  /** Строки итогов под таблицей */
  totals?: [string, string][]
  /** Колонки, которые печатаются по правому краю (индексы) */
  numeric?: number[]
  landscape?: boolean
}

const PLATFORM = 'Ebu.Gubkin'

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtml(spec: ReportSpec): string {
  const numeric = new Set(spec.numeric ?? [])
  const stamp = new Date().toLocaleString('ru-RU')

  const meta = (spec.meta ?? []).filter(([, v]) => v)
  const metaHtml = meta.length
    ? `<dl class="meta">${meta.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
    : ''

  const head = spec.headers
    .map((h, i) => `<th class="${numeric.has(i) ? 'num' : ''}">${esc(h)}</th>`)
    .join('')

  const body = spec.rows
    .map(r => `<tr>${r.map((c, i) => `<td class="${numeric.has(i) ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`)
    .join('')

  const totalsHtml = spec.totals?.length
    ? `<table class="totals"><tbody>${spec.totals
        .map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${esc(v)}</td></tr>`)
        .join('')}</tbody></table>`
    : ''

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>${esc(spec.title)}</title><style>
  @page { size: A4 ${spec.landscape ? 'landscape' : 'portrait'}; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 10pt/1.45 "Segoe UI", Arial, sans-serif; color: #000; }
  header { border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
  .platform { font-size: 8.5pt; letter-spacing: .12em; text-transform: uppercase; color: #444; }
  h1 { font-size: 15pt; margin: 2px 0 0; }
  .stamp { font-size: 8.5pt; color: #444; margin-top: 3px; }
  .meta { display: grid; grid-template-columns: auto 1fr; gap: 1px 10px; margin: 0 0 10px; font-size: 9pt; }
  .meta dt { color: #444; }
  .meta dd { margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  /* thead браузер повторяет на каждой странице сам — своя нумерация страниц
     в вёрстке не нужна и в HTML-печати всё равно недоступна. */
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #999; padding: 3px 5px; text-align: left; vertical-align: top; }
  th { background: #eee; font-weight: 600; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  tbody tr:nth-child(even) td { background: #f7f7f7; }
  .totals { width: auto; min-width: 60mm; margin: 10px 0 0 auto; font-size: 9.5pt; }
  .totals td { border: none; border-top: 1px solid #999; padding: 3px 5px; }
  .empty { margin: 16px 0; font-size: 9.5pt; color: #444; }
  footer { margin-top: 12px; font-size: 8pt; color: #666; }
</style></head><body>
<header>
  <div class="platform">${esc(PLATFORM)} · отчёт админки</div>
  <h1>${esc(spec.title)}</h1>
  <div class="stamp">Сформирован ${esc(stamp)}</div>
</header>
${metaHtml}
${spec.rows.length
    ? `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
    : '<p class="empty">Нет данных по заданным условиям.</p>'}
${totalsHtml}
<footer>Строк в отчёте: ${spec.rows.length}. Документ сформирован автоматически.</footer>
</body></html>`
}

/**
 * Печатает отчёт: скрытый iframe со своим документом, затем системный диалог
 * печати («Сохранить как PDF» есть в каждом браузере).
 */
export function printReport(spec: ReportSpec): void {
  const iframe = document.createElement('iframe')
  // Не display:none — часть браузеров не печатает невидимый фрейм.
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  iframe.srcdoc = buildHtml(spec)

  iframe.onload = () => {
    const win = iframe.contentWindow
    if (!win) { iframe.remove(); return }
    // Safari печатает пустую страницу без focus() на фрейме.
    win.focus()
    win.addEventListener('afterprint', () => iframe.remove())
    win.print()
    // Страховка: afterprint есть не везде, а висящий iframe копит память.
    setTimeout(() => iframe.remove(), 60_000)
  }

  document.body.appendChild(iframe)
}
