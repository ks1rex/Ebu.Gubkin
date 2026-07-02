const BACKEND_URL = process.env.BACKEND_URL
const SERVICE_KEY = process.env.SERVICE_SCHEDULE_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

// Все группы всех факультетов, читаем из кеша, который только что
// заполнил prefetch-meta (был замкнутый круг: раньше список групп для
// прогрева брался из уже закешированных schedule_* ключей, а те
// появляются только после прогрева — на старте кеш пуст и ничего
// никогда не прогревалось).
async function getAllGroups() {
  // 1. Получаем все факультеты из кеша
  const facRes = await fetch(
    `${SUPABASE_URL}/rest/v1/schedule_cache` +
    `?cache_key=eq.faculties`,
    { headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }}
  )
  const facRows = await facRes.json()
  if (!facRows.length) {
    console.log('No faculties in cache yet, skipping groups')
    return []
  }

  const faculties = facRows[0].data
  const allGroups = []

  // 2. Для каждого факультета берём группы из кеша
  for (const faculty of faculties) {
    const grpRes = await fetch(
      `${SUPABASE_URL}/rest/v1/schedule_cache` +
      `?cache_key=eq.groups_${faculty.id}`,
      { headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }}
    )
    const grpRows = await grpRes.json()
    if (grpRows.length) {
      const groups = grpRows[0].data
      allGroups.push(...groups.map(g => g.id))
    }
  }

  console.log(`Total groups to prefetch: ${allGroups.length}`)
  return allGroups
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

  // Небольшая пауза чтобы кеш записался
  await new Promise(r => setTimeout(r, 2000))

  const groups = await getAllGroups()
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
