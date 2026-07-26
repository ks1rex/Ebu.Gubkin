// Выгрузка отчётов админки в .xlsx.
//
// Почему не CSV. У CSV в Excel две взаимоисключающие беды: разделитель Excel
// берёт из региональных настроек Windows (наш `;` при системной запятой
// складывал всю строку в одну ячейку), а служебная строка `sep=;`, которая это
// лечит, заставляет Excel игнорировать BOM и читать файл как ANSI — кириллица
// превращается в мусор. Оба поведения — со стороны Excel, из файла их не
// починить: чем-то одним пришлось бы пожертвовать.
//
// В xlsx ни того, ни другого нет: XML внутри всегда UTF-8 (кириллица и эмодзи
// живут как есть), а границы ячеек заданы структурой, а не символом-разделителем.
//
// ponytail: формат собирается руками — ~140 строк против ~400 КБ SheetJS.
// Обошлось без библиотеки и без сжатия: элементы ZIP пишутся методом 0 (stored),
// поэтому не нужен ни deflate, ни CompressionStream. Файлы отчётов маленькие
// (десятки тысяч строк текста), разница в размере роли не играет. Понадобится
// несколько листов, формулы или форматирование — тогда SheetJS.
// Проверка формата: `node scripts/check-xlsx.mjs`.

// Тот же набор значений, что принимает печатный отчёт (ReportRow в reportData.ts).
export type SheetCell = string | number | null | undefined

// ─── XML ──────────────────────────────────────────────────────

// Управляющие символы Excel в XML не принимает — файл просто не откроется.
// Они вырезаются, а не экранируются: в выгрузках это мусор из чужих полей.
function stripControl(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (code > 31 || code === 9 || code === 10 || code === 13) out += ch
  }
  return out
}

function xmlEscape(value: string): string {
  return stripControl(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 0 → A, 25 → Z, 26 → AA
function columnName(index: number): string {
  let out = ''
  for (let n = index + 1; n > 0;) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function cellXml(value: SheetCell, ref: string): string {
  if (value == null || value === '') return ''
  // Числа — числами, чтобы в Excel по ним считались суммы, а не текст.
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`
  }
  // inlineStr вместо sharedStrings: одна таблица строк экономила бы размер,
  // но добавляла ещё одну часть архива и индексацию.
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(value))}</t></is></c>`
}

function sheetXml(headers: string[], rows: SheetCell[][]): string {
  const all = [headers as SheetCell[], ...rows]
  const body = all
    .map((row, r) => {
      const cells = row.map((v, c) => cellXml(v, `${columnName(c)}${r + 1}`)).join('')
      return `<row r="${r + 1}">${cells}</row>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`

function workbookXml(sheetName: string): string {
  // Ограничения Excel на имя листа: не длиннее 31 символа, без : \ / ? * [ ]
  const safe = xmlEscape(sheetName.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31)) || 'Отчёт'
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safe}" sheetId="1" r:id="rId1"/></sheets></workbook>`
}

// ─── ZIP (только метод 0, без сжатия) ─────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

interface ZipEntry { name: string; data: Uint8Array }

export function buildZip(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = enc.encode(entry.name)
    const crc = crc32(entry.data)

    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)  // подпись локального заголовка
    lv.setUint16(4, 20, true)          // требуемая версия
    lv.setUint16(6, 0x0800, true)      // флаг: имена в UTF-8
    lv.setUint16(8, 0, true)           // метод 0 — stored
    lv.setUint32(14, crc, true)
    lv.setUint32(18, entry.data.length, true)
    lv.setUint32(22, entry.data.length, true)
    lv.setUint16(26, name.length, true)
    local.set(name, 30)

    const dir = new Uint8Array(46 + name.length)
    const dv = new DataView(dir.buffer)
    dv.setUint32(0, 0x02014b50, true)
    dv.setUint16(4, 20, true)
    dv.setUint16(6, 20, true)
    dv.setUint16(8, 0x0800, true)
    dv.setUint16(10, 0, true)
    dv.setUint32(16, crc, true)
    dv.setUint32(20, entry.data.length, true)
    dv.setUint32(24, entry.data.length, true)
    dv.setUint16(28, name.length, true)
    dv.setUint32(42, offset, true)
    dir.set(name, 46)

    chunks.push(local, entry.data)
    central.push(dir)
    offset += local.length + entry.data.length
  }

  const centralSize = central.reduce((s, c) => s + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  const total = offset + centralSize + end.length
  const out = new Uint8Array(total)
  let pos = 0
  for (const part of [...chunks, ...central, end]) {
    out.set(part, pos)
    pos += part.length
  }
  return out
}

// ─── Публичное API ────────────────────────────────────────────

export function buildXlsx(headers: string[], rows: SheetCell[][], sheetName = 'Отчёт'): Uint8Array {
  const enc = new TextEncoder()
  return buildZip([
    { name: '[Content_Types].xml',      data: enc.encode(CONTENT_TYPES) },
    { name: '_rels/.rels',              data: enc.encode(ROOT_RELS) },
    { name: 'xl/workbook.xml',          data: enc.encode(workbookXml(sheetName)) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(WORKBOOK_RELS) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheetXml(headers, rows)) },
  ])
}

export function downloadXlsx(filename: string, headers: string[], rows: SheetCell[][], sheetName?: string) {
  // .buffer, а не сам Uint8Array: в типах DOM у BlobPart буфер обязан быть
  // ArrayBuffer, а Uint8Array объявлен над ArrayBufferLike.
  const bytes = buildXlsx(headers, rows, sheetName)
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
