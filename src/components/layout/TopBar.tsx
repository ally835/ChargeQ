import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'

interface TopBarProps {
  siteLabel?: string
}

export function TopBar({ siteLabel }: TopBarProps) {
  const siteInfo = useAppStore((s) => s.siteInfo)
  const appMode = useAppStore((s) => s.appMode)
  const navigate = useNavigate()
  const label = siteLabel ?? siteInfo.name

  // 7-click Easter egg
  const clickCount = useRef(0)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleLogoClick() {
    clickCount.current += 1
    if (clickTimer.current) clearTimeout(clickTimer.current)

    if (clickCount.current >= 7) {
      clickCount.current = 0
      navigate('/landing')
      return
    }

    // Reset counter after 2 seconds of inactivity
    clickTimer.current = setTimeout(() => {
      clickCount.current = 0
    }, 2000)
  }

  return (
    <div
      style={{
        flexShrink: 0,
        padding: 'max(12px, env(safe-area-inset-top, 12px)) 16px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(9,21,16,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '0.5px solid rgba(29,158,117,0.2)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Logo — 7 clicks opens the hidden landing page */}
      <div
        onClick={handleLogoClick}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default' }}
      >
        <div
          style={{
            width: 28, height: 28,
            background: 'var(--g)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="white">
            <path d="M7.5 1L3 7.5h3L4 12l6.5-8H7.5V1z"/>
          </svg>
        </div>
        <span
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 16,
            fontWeight: 800,
            color: 'var(--cream)',
          }}
        >
          ChargeQ
        </span>
      </div>

      {/* Site badge or admin pill */}
      {appMode === 'user' && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--teal)',
            padding: '3px 10px',
            background: 'var(--gl)',
            border: '0.5px solid var(--gb)',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <span
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--g)',
              display: 'inline-block',
              animation: 'pulseDot 1.6s ease-in-out infinite',
            }}
          />
          {label}
        </div>
      )}

      {appMode === 'admin' && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--amber-t)',
            padding: '3px 10px',
            background: 'var(--al)',
            border: '0.5px solid var(--ab)',
            borderRadius: 20,
          }}
        >
          ⚙ Site Manager
        </div>
      )}

      {appMode === 'superadmin' && (
        <div
          style={{
            fontSize: 11,
            color: '#85B7EB',
            padding: '3px 10px',
            background: 'rgba(55,138,221,.15)',
            border: '0.5px solid rgba(55,138,221,.4)',
            borderRadius: 20,
          }}
        >
          ⬡ ChargeQ HQ
        </div>
      )}
    </div>
  )
}
