import { AdminRoute } from 'ebu-gubkin'

export function Default() {
  return (
    <div style={{ background: '#1a2332', padding: 24 }}>
      <AdminRoute>
        <div style={{ color: '#e2e8f0' }}>Содержимое, доступное только администратору.</div>
      </AdminRoute>
    </div>
  )
}
