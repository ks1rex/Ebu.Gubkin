import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiCall } from '../lib/api'
import { compressImage, WORK_FILE } from '../lib/compressImage'
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

  async function handleSubmit(data: any, files: { file: File; visibility: string }[]) {
    await apiCall('PATCH', `/orders/${id}`, data)
    for (const { file, visibility } of files) {
      const fd = new FormData()
      fd.append('file', await compressImage(file, WORK_FILE))
      fd.append('visibility', visibility)
      await apiCall('POST', `/orders/${id}/attachments`, fd)
    }
    navigate(`/market/orders/${id}`)
  }

  async function handleDeleteAttachment(attachmentId: string) {
    await apiCall('DELETE', `/orders/${id}/attachments/${attachmentId}`)
  }

  if (pageLoading) return <Spinner color="#14a89a" /* teal-legacy — see tailwind.config.ts */ />
  if (!order) return <div className="text-red-400 p-8">Заказ не найден</div>
  if (order.status !== 'open' || order.executor_id) return <div className="text-red-400 p-8">Редактировать можно только открытый заказ без исполнителя</div>

  return (
    <OrderForm
      pageTitle="Редактировать заказ"
      submitLabel="Сохранить"
      submittingLabel="Сохранение..."
      initial={{ title: order.title, description: order.description, subject: order.subject, category: order.category, reserved_amount: order.reserved_amount, attachments: order.order_attachments }}
      alreadyReserved={parseFloat(order.reserved_amount)}
      onSubmit={handleSubmit}
      onDeleteAttachment={handleDeleteAttachment}
    />
  )
}
