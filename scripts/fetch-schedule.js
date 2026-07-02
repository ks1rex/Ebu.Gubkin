const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const GUBKIN_API = 'https://lk.gubkin.ru/schedule/api/api.php'
const STUDY_ID = 62

// Запрос к lk.gubkin.ru
async function gubkinFetch(params) {
  const url = new URL(GUBKIN_API)
  Object.entries(params).forEach(([k,v]) =>
    url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Запись в Supabase schedule_cache
async function saveCache(key, data, ttlHours) {
  const expiresAt = new Date(
    Date.now() + ttlHours * 3600000
  ).toISOString()

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/schedule_cache`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        cache_key: key,
        data: data,
        expires_at: expiresAt,
        last_accessed: new Date().toISOString()
      })
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase error: ${err}`)
  }
}

// Текущая и следующие 2 недели (понедельники)
function getWeekDates() {
  const dates = []
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)

  for (let w = 0; w < 3; w++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + w * 7)
    dates.push(
      `${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`
    )
  }
  return dates
}

async function main() {
  console.log('=== Schedule Cache Update ===')

  // 1. Факультеты
  console.log('Fetching faculties...')
  const facData = await gubkinFetch({
    act: 'list', method: 'getFaculties'
  })
  const faculties = facData.rows
  await saveCache('faculties', faculties, 24)
  console.log(`Cached ${faculties.length} faculties`)

  // 2. Группы каждого факультета
  const allGroups = []
  for (const faculty of faculties) {
    console.log(`Fetching groups for faculty ${faculty.id}...`)
    try {
      const grpData = await gubkinFetch({
        act: 'list',
        method: 'getFacultyGroups',
        facultyId: faculty.id
      })
      const groups = grpData.rows || []
      await saveCache(`groups_${faculty.id}`, groups, 24)
      allGroups.push(...groups.map(g => g.id))
      console.log(`  ${groups.length} groups`)
      await new Promise(r => setTimeout(r, 300))
    } catch(e) {
      console.error(`  Error for faculty ${faculty.id}:`, e.message)
    }
  }

  console.log(`Total groups: ${allGroups.length}`)

  // 3. Расписание для всех групп
  const dates = getWeekDates()
  console.log(`Dates to fetch: ${dates.join(', ')}`)

  let success = 0, errors = 0
  for (const groupId of allGroups) {
    for (const date of dates) {
      try {
        const schedData = await gubkinFetch({
          act: 'schedule',
          date: date,
          groupId: groupId,
          studyId: STUDY_ID
        })

        // Берём только Москву (id=0)
        const orgs = schedData.rows?.organizations || []
        const moscow = orgs.find(o => o.id === 0) || orgs[0]

        const cacheData = {
          week: schedData.rows?.week?.weekRussia,
          timeChunks: moscow?.lessonsTimeChunks || [],
          lessons: moscow?.lessons || []
        }

        await saveCache(
          `schedule_${groupId}_${date}`,
          cacheData,
          1
        )
        success++
        await new Promise(r => setTimeout(r, 200))
      } catch(e) {
        errors++
        console.error(
          `Error ${groupId}/${date}:`, e.message
        )
      }
    }
  }

  console.log(`Done! Success: ${success}, Errors: ${errors}`)
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
