import { useState } from 'react'
import { Star } from 'lucide-react'

interface Props {
  value?: number
  onChange?: (v: number) => void
  size?: number
  gap?: number
}

export default function StarRating({ value = 0, onChange, size = 20, gap = 2 }: Props) {
  const [hover, setHover] = useState(0)
  const display = onChange ? (hover || value) : value
  const interactive = !!onChange

  return (
    <div style={{ display: 'inline-flex', gap, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          fill={n <= display ? '#f59e0b' : 'none'}
          style={{ color: n <= display ? '#f59e0b' : '#334155', cursor: interactive ? 'pointer' : 'default', transition: 'color 0.1s', flexShrink: 0 }}
          onClick={() => interactive && onChange!(n)}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
        />
      ))}
    </div>
  )
}
