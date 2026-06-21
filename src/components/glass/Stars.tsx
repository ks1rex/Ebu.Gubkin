/** `.stars` from the glassmorphism handoff — gold ★/☆ glyphs. */
export default function Stars({ rating, className = '' }: { rating: number; className?: string }) {
  const filled = Math.round(rating)
  return (
    <span className={`inline-flex gap-px text-gold text-[13px] ${className}`}>
      {'★'.repeat(Math.max(0, filled))}{'☆'.repeat(Math.max(0, 5 - filled))}
    </span>
  )
}
