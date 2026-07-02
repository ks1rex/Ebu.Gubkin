const GRADIENTS = [
  'linear-gradient(135deg,#a78bfa,#7c3aed)',
  'linear-gradient(135deg,#34d399,#0ea5e9)',
  'linear-gradient(135deg,#f472b6,#a78bfa)',
  'linear-gradient(135deg,#fbbf24,#f472b6)',
  'linear-gradient(135deg,#38bdf8,#6366f1)',
]

/** Deterministic gradient pick so the same person always gets the same color. */
export function gradientFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return GRADIENTS[h % GRADIENTS.length]
}

export function initialsFor(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || name[0]!.toUpperCase()
}

interface Props {
  name: string | null | undefined
  src?: string | null
  size?: number
  radius?: number
  gradient?: string
  className?: string
  /** Renders the same violet→pink ring/glow used sitewide for VIP (see VipBadge.tsx). */
  isVip?: boolean
}

/** `.av-g` from the glassmorphism handoff — rounded SQUARE (not circle), initials on a gradient. */
export default function Avatar({ name, src, size = 42, radius = 14, gradient, className = '', isVip = false }: Props) {
  const inner = src ? (
    <img
      src={src}
      alt=""
      className={`object-cover shrink-0 ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
    />
  ) : (
    <div
      className={`grid place-items-center font-bold text-white shrink-0 ${className}`}
      style={{
        width: size, height: size, borderRadius: radius,
        background: gradient ?? gradientFor(name ?? '?'),
        fontSize: Math.round(size * 0.34),
      }}
    >
      {initialsFor(name)}
    </div>
  )

  if (!isVip) return inner

  const ring = Math.max(2, Math.round(size * 0.06))
  return (
    <div
      className="shrink-0 grid place-items-center"
      style={{
        width: size + ring * 2,
        height: size + ring * 2,
        borderRadius: radius + ring,
        background: 'linear-gradient(135deg,#7c3aed,#f5a3e8)',
        boxShadow: '0 0 10px rgba(124,58,237,.6)',
      }}
    >
      {inner}
    </div>
  )
}
