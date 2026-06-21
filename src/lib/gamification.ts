export const LEVEL_NAMES = [
  '', 'Первокурсник', 'Студент', 'Активист', 'Знаток', 'Эксперт',
  'Профессионал', 'Наставник', 'Легенда курса', 'Легенда факультета', 'Легенда Губкинского',
]

// Mirrors backend/src/utils/reputation.js LEVEL_THRESHOLDS exactly — keep in sync.
const LEVEL_THRESHOLDS = [0, 0, 200, 500, 1000, 2000, 3500, 5500, 8500, 12500, 18000]

// nextLevelReputation comes straight from GET /profile/:id/public (computed
// server-side by the same table) — pass it through; the local table is only
// a fallback if that field is ever missing.
export function levelProgress(level: number, reputation: number, nextLevelReputation?: number | null) {
  const current = LEVEL_THRESHOLDS[level] ?? 0
  const next = nextLevelReputation !== undefined ? nextLevelReputation : LEVEL_THRESHOLDS[level + 1]
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
