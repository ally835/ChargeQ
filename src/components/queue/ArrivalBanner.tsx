import { useState, useEffect, useRef } from 'react'

const ARRIVAL_WINDOW_SECS = 300 // 5 minutes

interface ArrivalBannerProps {
  bayNum: number | null
  onConfirm: () => void
  onSkip: () => void      // manual "I can't make it"
  onExpired: () => void   // countdown hit zero
}

export function ArrivalBanner({ bayNum, onConfirm, onSkip, onExpired }: ArrivalBannerProps) {
  const [secsLeft, setSecsLeft] = useState(ARRIVAL_WINDOW_SECS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!)
          onExpired() // countdown hit zero — distinct from manual skip
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60
  const display = `${mins}:${String(secs).padStart(2, '0')}`
  const isUrgent = secsLeft <= 60

  return (
    <>
      {/* Arrival banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1D9E75, #085041)',
        borderRadius: 'var(--rad)',
        padding: '20px 16px 16px',
        margin: '16px',
        textAlign: 'center',
        border: '0.5px solid rgba(29,158,117,0.4)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Radial shimmer */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08), transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div style={{ fontSize: 36, marginBottom: 6, position: 'relative' }}>⚡</div>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontSize: 20, color: '#fff',
          marginBottom: 6, position: 'relative',
        }}>
          Your bay is ready!
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', position: 'relative' }}>
          Please proceed to{' '}
          <strong style={{ color: '#fff' }}>
            {bayNum != null ? `Bay ${bayNum}` : 'your assigned bay'}
          </strong>
        </p>

        {/* Countdown */}
        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 800,
          color: isUrgent ? '#FAC775' : '#fff',
          margin: '10px 0 4px',
          position: 'relative',
          animation: isUrgent ? 'pulseDot 1s ease-in-out infinite' : 'none',
        }}>
          {display}
        </div>
        <p style={{ fontSize: 11, opacity: 0.75, position: 'relative' }}>
          Time remaining to confirm arrival
        </p>
      </div>

      {/* Confirm */}
      <button
        onClick={onConfirm}
        style={{
          width: 'calc(100% - 32px)',
          margin: '0 16px 8px',
          height: 52,
          background: '#fff',
          color: 'var(--gd)',
          border: 'none',
          borderRadius: 'var(--rads)',
          fontFamily: 'Syne, sans-serif',
          fontSize: 15, fontWeight: 800,
          cursor: 'pointer', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
        onMouseOver={(e) => { (e.target as HTMLElement).style.background = 'var(--mint)' }}
        onMouseOut={(e) => { (e.target as HTMLElement).style.background = '#fff' }}
      >
        ✓ I'm at the bay now
      </button>

      {/* Skip */}
      <button
        onClick={onSkip}
        style={{
          width: 'calc(100% - 32px)',
          margin: '0 16px 16px',
          height: 40,
          background: 'transparent',
          color: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 'var(--rads)',
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseOver={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
        onMouseOut={(e) => { (e.target as HTMLElement).style.background = 'transparent' }}
      >
        I can't make it — give bay to next driver
      </button>
    </>
  )
}
