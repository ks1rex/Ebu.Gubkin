// Выгрузка отчётов админки в таблицу.
//
// ponytail: CSV + window.print(), без библиотек. Excel/Google Sheets открывают
// CSV напрямую, а «печать → сохранить как PDF» есть в каждом браузере — это
// закрывает и таблицу, и PDF без пары мегабайт зависимостей (xlsx/jspdf).
// Заводить их стоит, только если понадобится вёрстка PDF или несколько листов.

export type CsvRow = (string | number | null | undefined)[]

// Excel в русской локали ждёт `;` как разделитель, а BOM — чтобы не сломать
// кириллицу. Кавычки внутри значения удваиваются по RFC 4180.
function cell(v: string | number | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: CsvRow[]): string {
  return [headers, ...rows].map(r => r.map(cell).join(';')).join('\r\n')
}

export function downloadCsv(filename: string, headers: string[], rows: CsvRow[]) {
  const blob = new Blob(['﻿' + toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Дата в имени файла: отчёты складываются в одну папку и должны сортироваться.
export function stampedName(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}`
}
