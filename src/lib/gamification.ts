export const LEVEL_NAMES = [
  '', 'Первокурсник', 'Студент', 'Активист', 'Знаток', 'Эксперт',
  'Профессионал', 'Наставник', 'Легенда курса', 'Легенда факультета', 'Легенда Губкинского',
]

// ponytail: no threshold table exists server-side (profiles.level/reputation are
// plain stored columns) — picked a reasonable curve client-side for the progress
// bar. If /profile/:id/public ever returns current_threshold/next_threshold,
// levelProgress() below prefers those instead.
const LEVEL_THRESHOLDS = [0, 0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000]

export function levelProgress(level: number, reputation: number, apiCurrent?: number, apiNext?: number) {
  const current = apiCurrent ?? LEVEL_THRESHOLDS[level] ?? 0
  const next = apiNext ?? LEVEL_THRESHOLDS[level + 1]
  if (next == null) return null // max level
  const pct = Math.max(0, Math.min(100, ((reputation - current) / (next - current)) * 100))
  return { pct, remaining: Math.max(0, next - reputation) }
}

export const ACHIEVEMENTS: Record<string, { emoji: string; name: string }> = {
  first_deal:        { emoji: '🎯', name: 'Первая сделка' },
  deals_5:            { emoji: '🔥', name: '5 сделок' },
  deals_20:           { emoji: '⚡', name: 'Надёжный исполнитель' },
  deals_50:           { emoji: '💎', name: 'Профи' },
  deals_100:          { emoji: '👑', name: 'Ветеран биржи' },
  top_rated:          { emoji: '⭐', name: 'Топ рейтинг' },
  perfect_score:      { emoji: '✨', name: 'Идеальный результат' },
  first_post:         { emoji: '📝', name: 'Первый пост' },
  posts_50:           { emoji: '💬', name: 'Активный участник' },
  posts_200:          { emoji: '🏆', name: 'Старожил форума' },
  popular_thread:     { emoji: '📣', name: 'Популярная тема' },
  viral_thread:       { emoji: '🚀', name: 'Вирусная тема' },
  early_bird:         { emoji: '🌅', name: 'Первопроходец' },
  verified_student:   { emoji: '✅', name: 'Студент подтверждён' },
  gost_master:        { emoji: '📄', name: 'Мастер ГОСТа' },
  wallet_top:         { emoji: '💰', name: 'Меценат' },
  referrer:           { emoji: '👥', name: 'Амбассадор' },
}
