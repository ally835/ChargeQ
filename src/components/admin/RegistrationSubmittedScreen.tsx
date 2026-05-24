interface RegistrationSubmittedScreenProps {
  onClose: () => void
}

export function RegistrationSubmittedScreen({ onClose }: RegistrationSubmittedScreenProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1500,
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
        {/* Success icon */}
        <div style={{
          width: 80, height: 80,
          background: 'var(--gl)', border: '2px solid var(--g)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 0 40px rgba(29,158,117,0.25)',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--cream)', marginBottom: 10 }}>
          Request submitted!
        </div>

        <div style={{ fontSize: 14, color: 'var(--mint)', lineHeight: 1.7, marginBottom: 24 }}>
          ChargeQ will review your request and respond to your email within <strong style={{ color: 'var(--cream)' }}>1 business day</strong>.
        </div>

        {/* What happens next */}
        <div style={{
          background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)',
          borderRadius: 'var(--rad)', padding: 18, marginBottom: 24,
          textAlign: 'left', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.3), transparent)' }} />
          <div className="section-label" style={{ marginBottom: 12 }}>What happens next</div>
          {[
            { icon: '📋', step: 'ChargeQ reviews your details and verifies your organisation' },
            { icon: '✅', step: 'Your account is approved and a temporary PIN is set' },
            { icon: '📱', step: 'You receive an email with login instructions' },
            { icon: '🔒', step: 'Log in with your email and set your own permanent PIN' },
          ].map(({ icon, step }, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < 3 ? 12 : 0, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: 'center' }}>{icon}</span>
              <span style={{ fontSize: 13, color: 'var(--mint)', lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
          Questions? Email{' '}
          <a href="mailto:hello@chargeq.com.au" style={{ color: 'var(--g)', textDecoration: 'none' }}>
            hello@chargeq.com.au
          </a>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', height: 52,
            background: 'var(--g)', color: '#fff', border: 'none',
            borderRadius: 14,
            fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(29,158,117,0.3)',
          }}
        >
          Back to app
        </button>
      </div>
    </div>
  )
}
