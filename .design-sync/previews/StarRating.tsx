import { StarRating } from 'ebu-gubkin'

export function Static() {
  return <StarRating value={4} />
}

export function Interactive() {
  return <StarRating value={3} onChange={() => {}} size={28} />
}
