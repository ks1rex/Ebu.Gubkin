import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiCall } from '../lib/api'
import Spinner from '../components/Spinner'
import ProfileView, { PublicProfile } from '../components/ProfileView'

export default function UserProfile() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiCall('GET', `/profile/${id}/public`)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spinner />
  if (!profile) return <div className="text-error">Пользователь не найден</div>

  return <ProfileView profile={profile} userId={id!} isOwner={false} />
}
