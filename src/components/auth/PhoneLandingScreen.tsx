import { useState, useRef, useEffect } from 'react'
import { useSendOTP, useResendTimer } from '@/hooks/useAuth'

interface PhoneLandingScreenProps {
  onOtpSent: (phone: string) => void
  onAdminHubOpen: () => void
}

export function PhoneLandingScreen({ onOtpSent, onAdminHubOpen }: PhoneLandingScreenProps) {
  const [phone, setPhone] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { sendOTP, loading, error, clearError } = useSendOTP()
  const { startTimer } = useResendTimer()

  useEffect(() => {
    // Floating light particles over the image
    const container = document.getElementById('cq-particles')
    if (!container) return
    container.innerHTML = ''
    for (let i = 0; i < 14; i++) {
      const dot = document.createElement('div')
      const size = Math.random() * 4 + 2
      dot.style.cssText = `
        position:absolute;
        border-radius:50%;
        background:rgba(255,255,255,${0.25 + Math.random() * 0.45});
        width:${size}px;height:${size}px;
        left:${Math.random() * 100}%;
        top:${40 + Math.random() * 60}%;
        --dx:${(Math.random() - 0.5) * 28}px;
        animation:floatUp ${3 + Math.random() * 4}s linear ${Math.random() * 3}s infinite;
      `
      container.appendChild(dot)
    }
  }, [])

  async function handleContinue() {
    const ok = await sendOTP(phone)
    if (ok) {
      startTimer()
      onOtpSent(phone)
    }
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100%',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: '#1a3a1a',
    }}>

      {/* ── Hero photo background ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(/hero-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
        backgroundRepeat: 'no-repeat',
      }} />

      {/* Gradient overlays — darken bottom so text is readable */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.05) 35%, rgba(9,21,16,0.65) 65%, rgba(9,21,16,0.95) 100%)',
      }} />

      {/* Subtle green tint to tie into the ChargeQ brand */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 100%, rgba(29,158,117,0.18) 0%, transparent 65%)',
      }} />

      {/* Particles */}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.5; }
          100% { transform: translateY(-110px) translateX(var(--dx, 12px)) scale(0.3); opacity: 0; }
        }
      `}</style>
      <div id="cq-particles" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, overflow: 'hidden' }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'max(14px, env(safe-area-inset-top, 14px)) 20px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 34, height: 34,
              background: 'rgba(29,158,117,0.9)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(8px)',
            }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13Z" />
              </svg>
            </div>
            <span style={{
              fontFamily: 'Syne, sans-serif', fontSize: 19, fontWeight: 800,
              color: '#fff', letterSpacing: '-0.01em',
              textShadow: '0 1px 8px rgba(0,0,0,0.3)',
            }}>ChargeQ</span>
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(12px)',
            border: '0.5px solid rgba(255,255,255,0.35)',
            borderRadius: 20, padding: '5px 14px',
            fontSize: 11, fontWeight: 500, color: '#fff',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#9FE1CB', display: 'inline-block',
              animation: 'pulseDot 2s ease-in-out infinite',
            }} />
            Australia
          </div>
        </div>

        {/* Spacer — pushes hero text to lower third of image */}
        <div style={{ flex: 1 }} />

        {/* Hero text — sits over the road/horizon area */}
        <div style={{ padding: '0 24px 20px', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 'clamp(28px, 8vw, 36px)',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.05,
            marginBottom: 8,
            textShadow: '0 2px 20px rgba(0,0,0,0.4)',
            letterSpacing: '-0.01em',
          }}>
            Welcome to ChargeQ
          </h1>
          <p style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 18, fontWeight: 300,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.4, marginBottom: 10,
            textShadow: '0 1px 8px rgba(0,0,0,0.25)',
          }}>
            The calm way to <em style={{ fontStyle: 'italic', color: '#9FE1CB' }}>charge.</em>
          </p>
          <p style={{
            fontSize: 14, color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.6, maxWidth: 300, margin: '0 auto',
            textShadow: '0 1px 8px rgba(0,0,0,0.3)',
          }}>
            Join the queue, go explore. We'll text you when your bay is ready.
          </p>
        </div>

        {/* Phone entry card */}
        <div style={{
          margin: '0 16px 8px',
          background: 'rgba(9,21,16,0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '0.5px solid rgba(29,158,117,0.35)',
          borderRadius: 20,
          padding: '20px 18px',
        }}>
          <label style={{
            display: 'block', fontSize: 12, fontWeight: 500,
            color: 'var(--mint)', marginBottom: 8, letterSpacing: '0.04em',
          }}>
            Your mobile number
          </label>
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            placeholder="04XX XXX XXX"
            autoComplete="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); if (error) clearError() }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleContinue() }}
            style={{
              width: '100%', height: 54, padding: '0 16px',
              background: 'rgba(255,255,255,0.07)',
              border: `1.5px solid ${error ? 'var(--r)' : 'rgba(29,158,117,0.35)'}`,
              borderRadius: 14, color: '#fff',
              fontFamily: '"DM Sans", sans-serif', fontSize: 19, fontWeight: 500,
              letterSpacing: '0.05em', outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => { if (!error) { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.15)' } }}
            onBlur={(e) => { e.target.style.borderColor = error ? 'var(--r)' : 'rgba(29,158,117,0.35)'; e.target.style.boxShadow = '' }}
          />
          {error && (
            <div style={{ fontSize: 12, color: '#F7C1C1', marginTop: 6 }}>{error}</div>
          )}

          <button
            onClick={handleContinue}
            disabled={loading}
            style={{
              width: '100%', height: 56, marginTop: 14,
              background: loading ? 'var(--gm)' : 'var(--g)',
              color: '#fff', border: 'none', borderRadius: 14,
              fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800,
              cursor: loading ? 'default' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: loading ? 'none' : '0 4px 24px rgba(29,158,117,0.45)',
              letterSpacing: '0.01em',
            }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = 'var(--gm)' }}
            onMouseOut={(e) => { if (!loading) e.currentTarget.style.background = 'var(--g)' }}
          >
            {loading ? (
              <><span className="cq-spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff' }} /> Sending code...</>
            ) : (
              <>Get started <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg></>
            )}
          </button>

          <p style={{
            fontSize: 11, color: 'rgba(255,255,255,0.4)',
            textAlign: 'center', marginTop: 12, lineHeight: 1.6,
          }}>
            By continuing you agree to receive SMS notifications.
            Details stored securely, never shared.
          </p>
        </div>

        {/* Feature strip */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, padding: '10px 24px 12px' }}>
          {[['📱', 'No app needed'], ['⚡', '60 sec setup'], ['🌿', 'Always free']].map(([icon, label]) => (
            <div key={label as string} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, marginBottom: 3 }}>{icon}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', lineHeight: 1.3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Admin entry */}
        <div style={{
          textAlign: 'center',
          padding: 'max(8px, 8px) 24px max(16px, env(safe-area-inset-bottom, 16px))',
        }}>
          <button
            onClick={onAdminHubOpen}
            style={{
              background: 'none', border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '8px 20px',
              fontSize: 11, color: 'rgba(255,255,255,0.28)',
              cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
              letterSpacing: '0.04em', transition: 'opacity 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = '0.7' }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Administration ONLY
          </button>
        </div>
      </div>
    </div>
  )
}
