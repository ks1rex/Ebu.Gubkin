import { useNavigate } from 'react-router-dom'
import { apiCall } from '../lib/api'
import { compressImage, WORK_FILE } from '../lib/compressImage'
import OrderForm from './OrderForm'

export default function NewOrder() {
  const navigate = useNavigate()

  async function handleSubmit(data: any, files: { file: File; visibility: string }[]) {
    const order = await apiCall('POST', '/orders', { ...data, order_type: 'order' })
    for (const { file, visibility } of files) {
      const fd = new FormData()
      fd.append('file', await compressImage(file, WORK_FILE))
      fd.append('visibility', visibility)
      await apiCall('POST', `/orders/${order.id}/attachments`, fd)
    }
    navigate(`/market/orders/${order.id}`)
  }

  return (
    <OrderForm
      pageTitle="Новый заказ"
      submitLabel="Разместить заказ"
      submittingLabel="Создание заказа..."
      onSubmit={handleSubmit}
    />
  )
}
