import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiCall } from '../lib/api'
import OrderForm from './OrderForm'
import Spinner from '../components/Spinner'

export default function OrderEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any>(null)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    apiCall('GET', `/orders/${id}`)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setPageLoading(false))
  }, [id])

  async function handleSubmit(data: any) {
    await apiCall('PATCH', `/orders/${id}`, data)
    navigate(`/market/orders/${id}`)
  }

  if (pageLoading) return <Spinner color="#14a89a" /* teal-legacy — see tailwind.config.ts */ />
  if (!order) return <div className="text-red-400 p-8">Заказ не найден</div>
  if (order.status !== 'open' || order.executor_id) return <div className="text-red-400 p-8">Редактировать можно только открытый заказ без исполнителя</div>

  return (
    <OrderForm
      pageTitle="Редактировать заказ"
      submitLabel="Сохранить"
      submittingLabel="Сохранение..."
      showFiles={false}
      initial={{ title: order.title, description: order.description, subject: order.subject, category: order.category, reserved_amount: order.reserved_amount }}
      alreadyReserved={parseFloat(order.reserved_amount)}
      onSubmit={handleSubmit}
    />
  )
}
