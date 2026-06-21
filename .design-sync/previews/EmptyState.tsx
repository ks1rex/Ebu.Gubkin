import { EmptyState } from 'ebu-gubkin'
import { Search } from 'lucide-react'

export function Default() {
  return <EmptyState title="Ничего не найдено" subtitle="Здесь пока пусто. Попробуйте изменить параметры поиска или вернитесь позже." />
}

export function WithAction() {
  return (
    <EmptyState
      icon={Search}
      title="Заказов пока нет"
      subtitle="Создайте первый заказ, чтобы начать пользоваться биржей."
      action={<button style={{ color: '#14a89a', fontWeight: 600 }}>Создать заказ</button>}
    />
  )
}
