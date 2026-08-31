import { useEffect, useRef, useState } from 'react'

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

// Не полагаемся на нативный loading="lazy" — у него на части браузеров
// щедрый отступ на несколько экранов вперёд, из-за чего десятки фото
// (особенно внешние — например преподы по прямым ссылкам на gubkin.ru, не
// в нашем хранилище) успевают встать в очередь к своему источнику ещё до
// прокрутки. Свой IntersectionObserver с узким отступом гарантирует, что
// запрос уходит только когда карточка реально почти на экране — например,
// единственный результат поиска получает src сразу, а не после того как
// раньше поставленные в очередь фото выше по списку долистают до конца.
function useInView<T extends Element>(rootMargin = '80px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (inView) return
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return }
    const observer = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) setInView(true) },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView, rootMargin])

  return { ref, inView }
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
  const { ref, inView } = useInView<HTMLDivElement>()

  const inner = src ? (
    <div ref={ref} className={`shrink-0 ${className}`} style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }}>
      {inView && (
        <img
          src={src}
          alt=""
          decoding="async"
          className="object-cover w-full h-full"
        />
      )}
    </div>
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
