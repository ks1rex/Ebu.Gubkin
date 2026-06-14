export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const sec  = Math.floor(diff / 1000)
  const min  = Math.floor(sec  / 60)
  const hr   = Math.floor(min  / 60)
  const day  = Math.floor(hr   / 24)
  const wk   = Math.floor(day  / 7)
  const mo   = Math.floor(day  / 30)
  const yr   = Math.floor(day  / 365)

  if (sec  < 60)  return 'только что'
  if (min  < 60)  return `${min} ${plural(min,  'минуту', 'минуты', 'минут')} назад`
  if (hr   < 24)  return `${hr}  ${plural(hr,   'час',    'часа',   'часов')} назад`
  if (day  === 1) return 'вчера'
  if (day  < 7)   return `${day} ${plural(day,  'день',   'дня',    'дней')} назад`
  if (wk   < 5)   return `${wk}  ${plural(wk,   'неделю', 'недели', 'недель')} назад`
  if (mo   < 12)  return `${mo}  ${plural(mo,   'месяц',  'месяца', 'месяцев')} назад`
  return `${yr} ${plural(yr, 'год', 'года', 'лет')} назад`
}

function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100
  const rem = abs % 10
  if (abs >= 11 && abs <= 19) return many
  if (rem === 1) return one
  if (rem >= 2 && rem <= 4) return few
  return many
}
