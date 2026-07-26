// Общие части выгрузки отчётов админки: имя файла и постраничный сбор данных.
// Сама запись таблицы — в exportXlsx.ts (Excel-файл вместо CSV, см. комментарий
// там: у CSV в Excel разделитель и кодировка исключают друг друга).

export type ReportRow = (string | number | null | undefined)[]

// Дата в имени файла: отчёты складываются в одну папку и должны сортироваться.
export function stampedName(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}`
}

/**
 * Собирает все страницы отчёта в один массив.
 *
 * Одним большим `limit` это не решается: PostgREST молча обрезает ответ на
 * db-max-rows (1000 строк) — ни ошибки, ни признака обрезки, просто меньше
 * данных. Поэтому «выгрузить всё» = цикл по страницам, ровно как fetchAll
 * на бэкенде (backend/src/utils/pagedFetch.js).
 *
 * ponytail: жёсткий предел в 200 страниц, чтобы случайный фильтр не увёл
 * браузер в бесконечную выгрузку. При limit=500 это 100 000 строк; понадобится
 * больше — поднимать предел вместе с серверной выгрузкой в файл.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<{ rows: T[]; total: number }>,
  limit = 500,
  maxPages = 200,
): Promise<{ rows: T[]; total: number; truncated: boolean }> {
  const first = await fetchPage(1, limit)
  const rows = [...first.rows]
  const pages = Math.min(Math.ceil(first.total / limit), maxPages)

  for (let p = 2; p <= pages; p++) {
    const next = await fetchPage(p, limit)
    // Пустая страница = данные разъехались с `total` (кто-то удалил строку
    // между запросами). Молча останавливаемся, а не крутим цикл дальше.
    if (!next.rows.length) break
    rows.push(...next.rows)
  }

  return { rows, total: first.total, truncated: rows.length < first.total }
}
