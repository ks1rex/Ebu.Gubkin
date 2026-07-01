const spin = `@keyframes mkt_spin { to { transform: rotate(360deg); } }`

export default function Spinner({ size = 32, color = '#14a89a', text = 'Загрузка...' }: { size?: number; color?: string; text?: string }) {
  return (
    <>
      <style>{spin}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '3rem 1rem', color: '#64748b' }}>
        <div style={{ width: size, height: size, border: `3px solid #1e3a4a`, borderTopColor: color, borderRadius: '50%', animation: 'mkt_spin 0.75s linear infinite' }} />
        {text && <span style={{ fontSize: '0.88rem' }}>{text}</span>}
      </div>
    </>
  )
}
