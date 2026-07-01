import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiCall } from '../lib/api'
import ServiceForm from './ServiceForm'
import Spinner from '../components/Spinner'

export default function ServiceEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [listing, setListing] = useState<any>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')

  useEffect(() => {
    apiCall('GET', `/listings/${id}`)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setPageLoading(false))
  }, [id])

  async function handleSubmit(data: any) {
    setError(''); setErrorCode(''); setSaving(true)
    try { await apiCall('PATCH', `/listings/${id}`, data); navigate(`/market/services/${id}`) }
    catch (e: any) { setError(e.message); setErrorCode(e.data?.code ?? '') }
    finally { setSaving(false) }
  }

  if (pageLoading) return <Spinner />
  if (!listing) return <div style={{ color: '#f87171', padding: '2rem' }}>Услуга не найдена</div>

  return <ServiceForm title="Редактировать услугу" initial={listing} onSubmit={handleSubmit} loading={saving} error={error} errorCode={errorCode} cancelTo={`/market/services/${id}`} />
}
