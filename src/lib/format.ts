/** URL segment for a user's profile — their chosen slug, UUID id otherwise. */
export function profileLink(user: { id?: string | null; profile_slug?: string | null } | null | undefined): string {
  return user?.profile_slug || user?.id || ''
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount == null) return '—'
  const n = parseFloat(String(amount))
  if (isNaN(n)) return '—'
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ₽'
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 0) return d.toLocaleDateString('ru-RU')
  if (diff < 60_000) return 'только что'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин назад`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч назад`
  if (diff < 172_800_000) return 'вчера'
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} дн назад`
  return d.toLocaleDateString('ru-RU')
}

/**
 * Рейтинг как он лежит в базе, без оглядки на число отзывов.
 *
 * Для админки и выгрузок: там нужны сырые данные — значение может быть выставлено
 * руками в Supabase при нулевом счётчике отзывов, и прятать его от администратора
 * неправильно. Публичным страницам нужен formatRating ниже.
 */
export function formatRatingValue(
  value: number | string | null | undefined,
  digits = 2,
): string | null {
  const n = parseFloat(String(value ?? ''))
  if (!Number.isFinite(n) || n <= 0) return null
  return n.toFixed(digits)
}

/**
 * Рейтинг показывается только при наличии отзывов.
 *
 * Рейтинг и число отзывов — две независимые колонки профиля, и они расходятся:
 * в базе встречается `rating_as_executor = 5.00` при `reviews_count_executor = 0`
 * (значение выставлено руками или осталось с прежней логики, а в таблице reviews
 * нет ни строки). Пока это правило было написано в каждом месте по-своему,
 * админка рисовала прочерк, а выгрузка в Excel — «5» по тем же данным.
 *
 * Только для публичных страниц: посетителю «5.00» без единого отзыва врёт.
 * В админке и выгрузках используется formatRatingValue — администратор должен
 * видеть то, что реально лежит в колонке.
 *
 * null означает «рейтинга нет» — вызывающий сам решает, что показать: прочерк,
 * пустую ячейку или ничего.
 */
export function formatRating(
  value: number | string | null | undefined,
  count: number | null | undefined,
  digits = 2,
): string | null {
  const n = parseFloat(String(value ?? ''))
  if (!count || !Number.isFinite(n) || n <= 0) return null
  return n.toFixed(digits)
}
