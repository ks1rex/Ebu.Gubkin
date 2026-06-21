import { Outlet } from 'react-router-dom'

export default function GostLayout() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Outlet />
    </div>
  )
}
