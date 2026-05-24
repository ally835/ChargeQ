import { useState, useRef } from 'react'
import { PinInput } from './PinInput'
import { useSiteManagerLogin } from '@/hooks/useAdmin'
import { isValidEmail } from '@/utils'
import { SiteManagerRegisterForm } from './SiteManagerRegisterForm'
import { RegistrationSubmittedScreen } from './RegistrationSubmittedScreen'

interface SiteManagerLoginOverlayProps {
  onClose: () => void
}

type View = 'login' | 'register' | 'submitted'

export function SiteManagerLoginOverlay({ onClose }: SiteManagerLoginOverlayProps) {
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', ''])
  const [newPin1, setNewPin1] = useState('')
  const [newPin2, setNewPin2] = useState('')
  const [changePinErr, setChangePinErr] = useState('')

  const {
    step, loading, error, clearError,
    checkEmail, verifyPin, changePin, goBackToEmail,
  } = useSiteManagerLogin()

  // ── Registration views ────────────────────────────────────────────

  if (view === 'register') {
    return (
      <SiteManagerRegisterForm
        onBack={() => setView('login')}
        onSubmitted={() => setView('submitted')}
      />
    )
  }

  if (view === 'submitted') {
    return <RegistrationSubmittedScreen onClose={onClose} />
  }

  // ── Login view ────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 12px',
    background: 'var(--bg3)', border: '0.5px solid rgba(29,158,117,0.25)',
    borderRadius: 'var(--rads)', color: 'var(--cream)',
    fontFamily: '"DM Sans", sans-serif', fontSize: 15, outline: 'none',
    textAlign: 'left', WebkitAppearance: 'none',
  }

  const panelStyle: React.CSSProperties = {
    width: '100%', maxWidth: 380,
    background: 'var(--surf)',
    border: '0.5px solid rgba(29,158,117,0.2)',
    borderRadius: 'var(--rad)',
    padding: '28px 24px',
    textAlign: 'center',
    position: 'relative',
  }

  async function handleEmailContinue() {
    if (!isValidEmail(email)) { setEmailErr('Please enter a valid email.'); return }
    setEmailErr('')
    await checkEmail(email)
  }

  async function handlePinComplete(code: string) {
    await verifyPin(code)
  }

  async function handleChangePinSubmit() {
    if (!/^\d{4}$/.test(newPin1)) { setChangePinErr('PIN must be exactly 4 digits.'); return }
    if (newPin1 !== newPin2) { setChangePinErr('PINs do not match.'); return }
    setChangePinErr('')
    await changePin('', newPin1)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)',
      zIndex: 1500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, overflowY: 'auto',
    }}>
      {/* Grid bg */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(29,158,117,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(29,158,117,0.05) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Email step */}
      {step === 'email' && (
        <div style={panelStyle}>
          <span style={{ fontSize: 40, display: 'block', marginBottom: 14 }}>⚡</span>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--cream)', marginBottom: 6 }}>
            Site Manager Login
          </div>
          <div style={{ fontSize: 13, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 24 }}>
            Enter your registered email to continue.
          </div>

          <div style={{ textAlign: 'left', marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', marginBottom: 5, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Email address
            </label>
            <input
              type="email"
              placeholder="you@company.com.au"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailErr(''); clearError() }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleEmailContinue() }}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.1)' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(29,158,117,0.25)'; e.target.style.boxShadow = '' }}
            />
            {(emailErr || error) && (
              <div style={{ fontSize: 11, color: '#F7C1C1', marginTop: 4 }}>{emailErr || error}</div>
            )}
          </div>

          <button
            onClick={handleEmailContinue}
            disabled={loading}
            style={{
              width: '100%', height: 48, border: 'none',
              background: loading ? 'var(--gm)' : 'var(--g)',
              color: '#fff', fontFamily: 'Syne, sans-serif',
              fontSize: 14, fontWeight: 700, borderRadius: 'var(--rads)',
              cursor: 'pointer', transition: 'all 0.2s', marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? <><span className="cq-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Checking...</> : 'Continue →'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)', fontSize: 11, marginBottom: 14 }}>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(29,158,117,0.2)' }} />
            <span>New to ChargeQ?</span>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(29,158,117,0.2)' }} />
          </div>

          {/* Request access button — opens registration form */}
          <button
            onClick={() => setView('register')}
            style={{
              width: '100%', height: 44,
              background: 'var(--gc)',
              border: '0.5px solid var(--gb)',
              borderRadius: 'var(--rads)',
              color: 'var(--teal)',
              fontFamily: '"DM Sans", sans-serif', fontSize: 13,
              cursor: 'pointer', marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--gl)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'var(--gc)' }}
          >
            🏢 Request site manager access
          </button>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', fontFamily: '"DM Sans", sans-serif', fontSize: 12, cursor: 'pointer', opacity: 0.55 }}
          >
            ← Back to app
          </button>
        </div>
      )}

      {/* PIN step */}
      {step === 'pin' && (
        <div style={panelStyle}>
          <span style={{ fontSize: 40, display: 'block', marginBottom: 14 }}>🔒</span>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--cream)', marginBottom: 6 }}>
            Enter your PIN
          </div>
          <div style={{ fontSize: 13, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 24 }}>
            Enter your 4-digit site manager PIN.
          </div>

          <div style={{ marginBottom: 16 }}>
            <PinInput
              length={4} value={pinDigits}
              onChange={(d) => { setPinDigits(d); clearError() }}
              onComplete={handlePinComplete}
              hasError={!!error} disabled={loading} large
            />
          </div>

          {error && <div style={{ fontSize: 12, color: '#F7C1C1', marginBottom: 12 }}>{error}</div>}
          {loading && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><div className="cq-spinner" /></div>}

          <button
            onClick={goBackToEmail}
            style={{ background: 'none', border: 'none', color: 'var(--mint)', fontFamily: '"DM Sans", sans-serif', fontSize: 12, cursor: 'pointer', padding: 8 }}
          >
            ← Use a different email
          </button>
        </div>
      )}

      {/* Change PIN step */}
      {step === 'change-pin' && (
        <div style={panelStyle}>
          <span style={{ fontSize: 40, display: 'block', marginBottom: 14 }}>🔏</span>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--cream)', marginBottom: 6 }}>
            Set your PIN
          </div>
          <div style={{ fontSize: 13, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 20 }}>
            Your administrator set a temporary PIN. Please set your own personal PIN to continue.
          </div>

          {[
            { label: 'New PIN', val: newPin1, set: setNewPin1 },
            { label: 'Confirm PIN', val: newPin2, set: setNewPin2 },
          ].map(({ label, val, set }) => (
            <div key={label} style={{ textAlign: 'left', marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', marginBottom: 5, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
              <input
                type="tel" inputMode="numeric" maxLength={4}
                placeholder="4 digits" value={val}
                onChange={(e) => { set(e.target.value.replace(/\D/g, '').slice(0, 4)); setChangePinErr('') }}
                style={{ ...inputStyle, textAlign: 'center', fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, letterSpacing: '0.2em' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.1)' }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(29,158,117,0.25)'; e.target.style.boxShadow = '' }}
              />
            </div>
          ))}

          {(changePinErr || error) && <div style={{ fontSize: 12, color: '#F7C1C1', marginBottom: 12 }}>{changePinErr || error}</div>}

          <button
            onClick={handleChangePinSubmit}
            disabled={loading}
            style={{
              width: '100%', height: 48, border: 'none',
              background: 'var(--g)', color: '#fff',
              fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
              borderRadius: 'var(--rads)', cursor: 'pointer', marginTop: 8,
            }}
          >
            {loading ? 'Saving...' : 'Save PIN & continue →'}
          </button>
        </div>
      )}

      {/* Pending step */}
      {step === 'pending' && (
        <div style={panelStyle}>
          <span style={{ fontSize: 52, display: 'block', marginBottom: 16 }}>⏳</span>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--cream)', marginBottom: 6 }}>
            Awaiting approval
          </div>
          <div style={{ fontSize: 13, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 20 }}>
            Your request has been submitted. ChargeQ will review and activate your account within 1 business day.
          </div>
          <p style={{ fontSize: 12, color: 'var(--mint)', lineHeight: 1.6 }}>
            Questions? Email{' '}
            <a href="mailto:hello@chargeq.com.au" style={{ color: 'var(--g)', textDecoration: 'none' }}>
              hello@chargeq.com.au
            </a>
          </p>
          <button onClick={onClose} style={{ marginTop: 20, background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>
            ← Back to app
          </button>
        </div>
      )}
    </div>
  )
}
