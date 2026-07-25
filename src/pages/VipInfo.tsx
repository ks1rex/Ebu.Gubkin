import { Crown } from 'lucide-react'
import { GlassCard, Button } from '../components/glass'

// ponytail: заглушка — содержимое страницы делается отдельной задачей,
// здесь только чтобы «Подробнее →» из кошелька вело на живой роут.
export default function VipInfo() {
  return (
    <GlassCard className="rounded-[26px] px-8 py-7 max-w-[640px]">
      <h1 className="text-2xl font-bold tracking-[-.5px] text-ink flex items-center gap-2 mb-3">
        <Crown size={22} className="text-gold" /> VIP-статус
      </h1>
      <p className="text-sm text-subtle leading-relaxed mb-5">
        Подробное описание возможностей VIP скоро появится здесь. Оформить подписку можно в кошельке.
      </p>
      <Button to="/wallet" variant="mint">В кошелёк</Button>
    </GlassCard>
  )
}
