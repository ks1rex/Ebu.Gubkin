// Проверка сборщика .xlsx: собирает файл и разбирает его обратно.
//
// Формат бинарный и собирается руками (src/lib/exportXlsx.ts), поэтому ошибка
// здесь выглядит как «Excel не может открыть файл» — tsc такое не поймает.
// Скрипт компилирует модуль через esbuild (он уже стоит вместе с vite), пишет
// таблицу с кириллицей, эмодзи и числами и проверяет структуру архива: подписи
// ZIP, CRC32 каждого элемента, наличие обязательных частей пакета и то, что
// текст лежит внутри как UTF-8. Готовый файл остаётся на диске — путь печатается,
// его можно открыть в Excel руками.
//
// Запуск: node scripts/check-xlsx.mjs

import { build } from 'esbuild'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const dir = mkdtempSync(join(tmpdir(), 'xlsx-check-'))
const bundle = join(dir, 'exportXlsx.mjs')

await build({
  entryPoints: ['src/lib/exportXlsx.ts'],
  outfile: bundle,
  format: 'esm',
  bundle: true,
  logLevel: 'silent',
})

const { buildXlsx } = await import(`file://${bundle}`)

// ─── Разбор ZIP по центральному каталогу ──────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function unzip(input) {
  const bytes = Buffer.from(input)
  const eocd = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  assert.ok(eocd > 0, 'нет End of Central Directory — это не ZIP')

  const count = bytes.readUInt16LE(eocd + 10)
  let pos = bytes.readUInt32LE(eocd + 16)
  const parts = {}

  for (let i = 0; i < count; i++) {
    assert.equal(bytes.readUInt32LE(pos), 0x02014b50, `элемент ${i}: битая подпись в каталоге`)
    const method      = bytes.readUInt16LE(pos + 10)
    const crc         = bytes.readUInt32LE(pos + 16)
    const size        = bytes.readUInt32LE(pos + 24)
    const nameLen     = bytes.readUInt16LE(pos + 28)
    const extraLen    = bytes.readUInt16LE(pos + 30)
    const commentLen  = bytes.readUInt16LE(pos + 32)
    const localOffset = bytes.readUInt32LE(pos + 42)
    const name = bytes.slice(pos + 46, pos + 46 + nameLen).toString('utf8')

    // Пишем только stored (метод 0) — распаковка здесь не нужна и не должна
    // потребоваться: если метод другой, значит сборщик изменился незаметно.
    assert.equal(method, 0, `${name}: элемент сжат, ожидался stored`)

    assert.equal(bytes.readUInt32LE(localOffset), 0x04034b50, `${name}: битый локальный заголовок`)
    const localNameLen  = bytes.readUInt16LE(localOffset + 26)
    const localExtraLen = bytes.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLen + localExtraLen
    const data = bytes.slice(dataStart, dataStart + bytes.readUInt32LE(localOffset + 18))

    assert.equal(crc32(data), crc, `${name}: CRC32 не сходится — Excel сочтёт архив повреждённым`)
    assert.equal(data.length, size, `${name}: размер не совпадает с каталогом`)

    parts[name] = data.toString('utf8')
    pos += 46 + nameLen + extraLen + commentLen
  }
  return { parts, count }
}

const sheetOf = input => unzip(input).parts['xl/worksheets/sheet1.xml']

// ─── Обычная выгрузка ─────────────────────────────────────────

const HEADERS = ['Никнейм', 'Баланс', 'Комментарий']
const ROWS = [
  ['Пётр Ы', 1234.56, 'Кириллица, эмодзи 🎯 и кавычки "тест"'],
  ['a<b>&c', -0.5, 'Точка с запятой; запятая, перевод\nстроки'],
  ['Ёлка', 0, null],
]

const bytes = Buffer.from(buildXlsx(HEADERS, ROWS, 'Пользователи'))
const { parts, count } = unzip(bytes)

for (const required of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
                        'xl/_rels/workbook.xml.rels', 'xl/worksheets/sheet1.xml']) {
  assert.ok(parts[required], `в архиве нет обязательной части ${required}`)
}

const sheet = parts['xl/worksheets/sheet1.xml']

// Кириллица и эмодзи должны дойти как есть — ровно то, что ломалось в CSV.
assert.ok(sheet.includes('Никнейм'), 'потерялась кириллица в шапке')
assert.ok(sheet.includes('Пётр Ы'), 'потерялась кириллица в данных')
assert.ok(sheet.includes('🎯'), 'потерялся эмодзи')
assert.ok(sheet.includes('Ёлка'), 'потерялась буква Ё')
assert.ok(parts['xl/workbook.xml'].includes('Пользователи'), 'потерялось имя листа')

// XML-опасные символы экранированы, а не вставлены как есть.
assert.ok(sheet.includes('a&lt;b&gt;&amp;c'), 'не экранированы < > &')
assert.ok(!sheet.includes('<b>&c'), 'сырой XML попал в ячейку')

// Числа лежат числами (<v>), текст — inlineStr: иначе Excel не посчитает сумму.
assert.ok(sheet.includes('<v>1234.56</v>'), 'число ушло не как число')
assert.ok(sheet.includes('<v>-0.5</v>'), 'отрицательное число ушло не как число')
assert.ok(sheet.includes('t="inlineStr"'), 'текст ушёл не как строка')

// Ссылки на ячейки: шапка в первой строке, данные ниже.
assert.ok(sheet.includes('r="A1"'), 'нет ячейки A1')
assert.ok(sheet.includes('r="C2"'), 'нет ячейки C2')
assert.ok(sheet.includes('<row r="4">'), 'нет четвёртой строки (шапка + 3 записи)')

// Пустая ячейка не пишется вовсе — Excel сам считает её пустой.
assert.ok(!sheet.includes('r="C4"'), 'null записан ячейкой вместо пропуска')

// ─── Широкая таблица: имена колонок за пределами A..Z ─────────

const wide = sheetOf(buildXlsx(
  Array.from({ length: 28 }, (_, i) => `к${i + 1}`),
  [Array.from({ length: 28 }, (_, i) => i + 1)],
))
assert.ok(wide.includes('r="Z1"'),  'нет колонки Z')
assert.ok(wide.includes('r="AA1"'), 'нет колонки AA — сломан перенос через 26 колонок')
assert.ok(wide.includes('r="AB1"'), 'нет колонки AB')

// ─── Пустой отчёт ─────────────────────────────────────────────

// Выгрузка без строк не должна давать битый файл: «нет данных» — обычный случай
// при узком фильтре.
const empty = sheetOf(buildXlsx(['Показатель'], []))
assert.ok(empty.includes('<row r="1">'), 'в пустом отчёте нет даже шапки')

const sample = join(dir, 'sample.xlsx')
writeFileSync(sample, bytes)
console.log(`xlsx check passed — ${count} частей, ${bytes.length} байт`)
console.log(`пример файла: ${sample}`)
