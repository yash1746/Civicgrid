/**
 * CivicGrid — LoadingSpinner Component
 */
export default function LoadingSpinner({ size = 'md', text = null, fullPage = false }) {
  const sizeClass = size === 'lg' ? 'spinner-lg' : ''
  
  if (fullPage) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        background: 'var(--bg-base)',
      }}>
        <span className="navbar-brand" style={{ fontSize: '1.5rem', letterSpacing: 4 }}>⚡ CIVICGRID</span>
        <div className={`spinner ${sizeClass}`} />
        {text && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{text}</p>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div className={`spinner ${sizeClass}`} />
      {text && <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{text}</span>}
    </div>
  )
}
