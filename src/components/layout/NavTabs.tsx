import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'

const USER_TABS = [
  {
    path: '/',
    label: 'Queue',
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    path: '/finder',
    label: 'Finder',
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    path: '/help',
    label: 'Info',
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
]

const ADMIN_TABS = [
  { path: '/admin/queue',    label: 'Queue' },
  { path: '/admin/bays',     label: 'Bays' },
  { path: '/admin/reports',  label: 'Reports' },
  { path: '/admin/ads',      label: 'Ads' },
  { path: '/admin/settings', label: 'Settings' },
]

const SA_TABS = [
  { path: '/admin/queue',     label: 'Sites' },
  { path: '/admin/approvals', label: 'Approvals' },
  { path: '/admin/reports',   label: 'Reports' },
  { path: '/admin/settings',  label: 'Settings' },
]

export function NavTabs() {
  const navigate = useNavigate()
  const location = useLocation()
  const appMode = useAppStore((s) => s.appMode)
  const pendingManagerCount = useAppStore((s) => s.pendingManagerCount)

  // ── CRITICAL: Admin tabs only render when authenticated as admin ──
  // appMode is 'user' by default and only changes after PIN verification
  if (appMode === 'admin' || appMode === 'superadmin') {
    const tabs = appMode === 'superadmin' ? SA_TABS : ADMIN_TABS
    return (
      <nav style={{
        flexShrink: 0, display: 'flex',
        background: 'rgba(13,32,24,0.95)',
        borderBottom: '0.5px solid rgba(239,159,39,0.2)',
        position: 'relative', zIndex: 10,
      }}>
        {tabs.map((tab) => {
          const active = location.pathname === tab.path
          const showBadge = appMode === 'superadmin' && tab.path === '/admin/approvals' && pendingManagerCount > 0
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path + location.search)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '8px 4px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: '"DM Sans", sans-serif', fontSize: 10,
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--a)' : 'var(--text3)',
                transition: 'all .2s', position: 'relative',
              }}
            >
              {tab.label}
              {showBadge && (
                <span style={{
                  position: 'absolute', top: 6, right: 'calc(50% - 14px)',
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#E24B4A',
                  boxShadow: '0 0 0 1.5px rgba(13,32,24,0.95)',
                }} />
              )}
              {active && (
                <span style={{
                  position: 'absolute', bottom: 0,
                  left: '20%', right: '20%', height: 2,
                  background: 'var(--a)', borderRadius: '1px 1px 0 0',
                }} />
              )}
            </button>
          )
        })}
      </nav>
    )
  }

  // Default: user nav
  return (
    <nav style={{
      flexShrink: 0, display: 'flex',
      background: 'rgba(13,32,24,0.95)',
      borderBottom: '0.5px solid rgba(29,158,117,0.15)',
      position: 'relative', zIndex: 10,
    }}>
      {USER_TABS.map((tab) => {
        const active = location.pathname === tab.path
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path + location.search)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '8px 4px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif', fontSize: 10,
              fontWeight: active ? 500 : 400,
              color: active ? 'var(--g)' : 'var(--text3)',
              transition: 'all .2s', position: 'relative',
            }}
          >
            {tab.icon(active)}
            {tab.label}
            {active && (
              <span style={{
                position: 'absolute', bottom: 0,
                left: '20%', right: '20%', height: 2,
                background: 'var(--g)', borderRadius: '1px 1px 0 0',
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
