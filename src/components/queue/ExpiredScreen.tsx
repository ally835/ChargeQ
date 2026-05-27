import { useState } from 'react'
import type { ChargerType, PortSide } from '@/types'
import { CHARGER_INFO } from '@/utils'

interface ExpiredScreenProps {
  charger: ChargerType
  portSide: PortSide
  siteName: string
  onRejoin: () => Promise<void>
  onDecline: () => void
}

export function ExpiredScreen({ charger, siteName, onRejoin, onDecline }: ExpiredScreenProps) {
  const [loading, setLoading] = useState(false)
  const chargerInfo = CHARGER_INFO[charger] ?? { icon: '⚡', name: charger }

  async function handleRejoin() {
    setLoading(true)
    await onRejoin()
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 32px', textAlign: 'center', animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)' }}>
      {/* Icon */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(226,75,74,0.12)', border: '1.5px solid rgba(226,75,74,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, marginBottom: 20,
      }}>
        ⏱
      </div>

      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--cream)', marginBottom: 10 }}>
        Time's up
      </h2>

      <p style={{ fontSize: 14, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 6, maxWidth: 280 }}>
        Your 5-minute window to claim your bay at <strong style={{ color: 'var(--cream)' }}>{siteName}</strong> has expired.
      </p>
      <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 32, maxWidth: 280 }}>
        Your spot has been released to the next driver in the queue.
      </p>

      {/* Rejoin info */}
      <div style={{
        background: 'var(--gl)', border: '0.5px solid var(--gb)',
        borderRadius: 'var(--rads)', padding: '12px 16px',
        marginBottom: 24, width: '100%', maxWidth: 320,
      }}>
        <div style={{ fontSize: 11, color: 'var(--teal)', marginBottom: 4 }}>You'd be rejoining for</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cream)' }}>
          {chargerInfo.icon} {chargerInfo.name} · {siteName}
        </div>
      </div>

      {/* Rejoin button */}
      <button
        onClick={handleRejoin}
        disabled={loading}
        style={{
          width: '100%', maxWidth: 320, height: 52,
          background: 'var(--g)', color: '#fff', border: 'none',
          borderRadius: 'var(--rads)',
          fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800,
          cursor: 'pointer', marginBottom: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s',
        }}
      >
        {loading ? 'Joining…' : '⚡ Yes, rejoin the queue'}
      </button>

      <button
        onClick={onDecline}
        style={{
          width: '100%', maxWidth: 320, height: 44,
          background: 'transparent', border: '0.5px solid rgba(240,239,232,0.12)',
          borderRadius: 'var(--rads)', color: 'var(--text3)',
          fontFamily: '"DM Sans", sans-serif', fontSize: 13, cursor: 'pointer',
        }}
      >
        No thanks, I'm done charging today
      </button>
    </div>
  )
}
