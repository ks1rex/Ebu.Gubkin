const BACKEND_URL = process.env.BACKEND_URL
const SERVICE_KEY = process.env.SERVICE_SCHEDULE_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

// Список популярных групп для прекеша
// (берём из schedule_cache по last_accessed)
async function getPopularGroups() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/schedule_cache` +
    `?cache_key=like.schedule_*` +
    `&order=last_accessed.desc&limit=20`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  )
  const rows = await res.json()
  // Извлекаем groupId из cache_key вида
  // "schedule_9206_29-6-2026"
  return [...new Set(
    rows.map(r => r.cache_key.split('_')[1])
       .filter(Boolean)
  )]
}

// Текущая и следующая неделя
function getWeekDates() {
  const dates = []
  const now = new Date()
  // Найти ближайший понедельник
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)

  // Текущая и следующие 2 недели
  for (let w = 0; w < 3; w++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + w * 7)
    // Формат D-M-YYYY без ведущих нулей
    dates.push(
      `${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`
    )
  }
  return dates
}

async function prefetchGroup(groupId, date) {
  await fetch(`${BACKEND_URL}/schedule/prefetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Key': SERVICE_KEY
    },
    body: JSON.stringify({groupId, date, studyId: 62})
  })
}

async function main() {
  console.log('Fetching schedule cache...')

  // Всегда кешируем факультеты и группы
  await fetch(`${BACKEND_URL}/schedule/prefetch-meta`, {
    method: 'POST',
    headers: {'X-Service-Key': SERVICE_KEY}
  })

  const groups = await getPopularGroups()
  const dates = getWeekDates()

  console.log(`Groups: ${groups.length}, Dates: ${dates}`)

  for (const groupId of groups) {
    for (const date of dates) {
      await prefetchGroup(groupId, date)
      // Небольшая пауза чтобы не DDoS-ить
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log('Done!')
}

main().catch(err => { console.error(err); process.exit(1) })
