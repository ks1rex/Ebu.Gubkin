export const LEVEL_NAMES = [
  '', 'Первокурсник', 'Студент', 'Активист', 'Знаток', 'Эксперт',
  'Профессионал', 'Наставник', 'Легенда курса', 'Легенда факультета', 'Легенда Губкинского',
]

// Mirrors backend/src/utils/reputation.js LEVEL_THRESHOLDS exactly — keep in sync.
export const LEVEL_THRESHOLDS = [0, 0, 200, 500, 1000, 2000, 3500, 5500, 8500, 12500, 18000]

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

interface AchievementDef {
  emoji: string
  name: string
  desc: string
  /** Present only when progress is trackable from PublicProfile's own fields. */
  target?: number
  statKey?: 'deals_count' | 'forum_posts_count'
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  first_deal:       { emoji: '🎯', name: 'Первая сделка',        desc: 'Завершите первую сделку на бирже', target: 1, statKey: 'deals_count' },
  deals_5:          { emoji: '🔥', name: '5 сделок',              desc: 'Завершите 5 сделок на бирже', target: 5, statKey: 'deals_count' },
  deals_20:         { emoji: '⚡', name: 'Надёжный исполнитель',  desc: 'Завершите 20 сделок на бирже', target: 20, statKey: 'deals_count' },
  deals_50:         { emoji: '💎', name: 'Профи',                 desc: 'Завершите 50 сделок на бирже', target: 50, statKey: 'deals_count' },
  deals_100:        { emoji: '👑', name: 'Ветеран биржи',         desc: 'Завершите 100 сделок на бирже', target: 100, statKey: 'deals_count' },
  top_rated:        { emoji: '⭐', name: 'Топ рейтинг',           desc: 'Поддерживайте высокий рейтинг исполнителя (4.8+) на бирже' },
  perfect_score:    { emoji: '✨', name: 'Идеальный результат',   desc: 'Получите оценку 5.0 за выполненную работу' },
  first_post:       { emoji: '📝', name: 'Первый пост',           desc: 'Напишите первый пост на форуме', target: 1, statKey: 'forum_posts_count' },
  posts_50:         { emoji: '💬', name: 'Активный участник',     desc: 'Напишите 50 постов на форуме', target: 50, statKey: 'forum_posts_count' },
  posts_200:        { emoji: '🏆', name: 'Старожил форума',       desc: 'Напишите 200 постов на форуме', target: 200, statKey: 'forum_posts_count' },
  popular_thread:   { emoji: '📣', name: 'Популярная тема',       desc: 'Создайте тему, набравшую 500+ просмотров' },
  viral_thread:     { emoji: '🚀', name: 'Вирусная тема',         desc: 'Создайте тему, набравшую 2000+ просмотров' },
  early_bird:       { emoji: '🌅', name: 'Первопроходец',         desc: 'Будьте одним из первых пользователей платформы' },
  verified_student: { emoji: '✅', name: 'Студент подтверждён',   desc: 'Подтвердите статус студента' },
  gost_master:      { emoji: '📄', name: 'Мастер ГОСТа',          desc: 'Сгенерируйте несколько работ в ГОСТ-калькуляторе' },
  wallet_top:       { emoji: '💰', name: 'Меценат',               desc: 'Пополните баланс кошелька на крупную сумму' },
  referrer:         { emoji: '👥', name: 'Амбассадор',            desc: 'Пригласите друга по реферальной ссылке' },
}
