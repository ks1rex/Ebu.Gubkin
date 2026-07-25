import { LEVEL_NAMES, levelProgress } from '../lib/gamification'

interface Props {
  level: number
  reputation: number
  /** From GET /profile/:id/public — null means max level reached. */
  nextLevelReputation?: number | null
  /** Shown instead of the bar at max level. Nothing rendered when omitted. */
  maxLevelNote?: string
}

/**
 * Level header + progress bar, shared by the profile card and /vip-info.
 * Markup lifted verbatim from ProfileView — the wrapper (card, button,
 * spacing) stays at each call site, this owns only the header/bar/caption.
 */
export default function LevelProgressBar({ level, reputation, nextLevelReputation, maxLevelNote }: Props) {
  const progress = levelProgress(level, reputation, nextLevelReputation)

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-ink">Уровень {level} — {LEVEL_NAMES[level] ?? ''}</span>
        <span className="text-xs text-subtle">{reputation} репутации</span>
      </div>
      {progress ? (
        <>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-lav to-mint rounded-full" style={{ width: `${progress.pct}%` }} />
          </div>
          <div className="text-xs text-subtle mt-1.5">ещё {progress.remaining} репутации до следующего уровня</div>
        </>
      ) : maxLevelNote ? (
        <div className="text-xs text-subtle">{maxLevelNote}</div>
      ) : null}
    </>
  )
}
