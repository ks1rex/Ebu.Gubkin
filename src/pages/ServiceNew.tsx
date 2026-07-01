import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiCall } from '../lib/api'
import ServiceForm from './ServiceForm'

export default function ServiceNew() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')

  async function handleSubmit(data: any) {
    setError(''); setErrorCode(''); setLoading(true)
    try {
      const listing = await apiCall('POST', '/listings', data)
      navigate(`/market/services/${listing.id}`)
    } catch (e: any) { setError(e.message); setErrorCode(e.data?.code ?? '') }
    finally { setLoading(false) }
  }

  return <ServiceForm title="Новая услуга" onSubmit={handleSubmit} loading={loading} error={error} errorCode={errorCode} cancelTo="/market/services/mine" />
}
