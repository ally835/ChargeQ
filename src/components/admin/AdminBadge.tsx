import { useAppStore } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'

interface AdminBadgeProps {
  icon: string
  label: string
}

export function AdminBadge({ icon, label }: AdminBadgeProps) {
  const siteInfo = useAppStore((s) => s.siteInfo)
  const setAppMode = useAppStore((s) => s.setAppMode)
  const navigate = useNavigate()

  function handleLockOut() {
    setAppMode('user')
    navigate('/')
  }

  return (
    <div style={{
      background: 'var(--al)', border: '0.5px solid var(--ab)',
      borderRadius: 'var(--rads)', padding: '9px 12px',
      fontSize: 12, color: 'var(--amber-t)',
      marginBottom: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span>
        <span>{label}{siteInfo.name ? ` • ${siteInfo.name}` : ''}</span>
      </div>
      <button
        onClick={handleLockOut}
        style={{
          background: 'none', border: '0.5px solid rgba(239,159,39,0.3)',
          borderRadius: 6, padding: '3px 8px',
          fontSize: 11, color: 'rgba(239,159,39,0.6)',
          cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
          transition: 'color 0.2s',
          flexShrink: 0,
        }}
        onMouseOver={(e) => { (e.target as HTMLElement).style.color = 'var(--amber-t)' }}
        onMouseOut={(e) => { (e.target as HTMLElement).style.color = 'rgba(239,159,39,0.6)' }}
      >
        🔒 Lock
      </button>
    </div>
  )
}
