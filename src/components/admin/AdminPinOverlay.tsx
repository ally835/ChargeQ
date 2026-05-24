import { useState } from 'react'
import { PinInput } from './PinInput'

interface AdminPinOverlayProps {
  title: string
  subtitle: string
  onSuccess: (pin: string) => void
  onCancel: () => void
  loading?: boolean
  error?: string | null
}

export function AdminPinOverlay({
  title,
  subtitle,
  onSuccess,
  onCancel,
  loading,
  error,
}: AdminPinOverlayProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', ''])

  async function handleComplete(code: string) {
    onSuccess(code)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1500,
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(29,158,117,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(29,158,117,0.05) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      <div style={{
        width: '100%', maxWidth: 360,
        background: 'var(--surf)',
        border: '0.5px solid rgba(29,158,117,0.2)',
        borderRadius: 'var(--rad)',
        padding: '28px 24px',
        textAlign: 'center',
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{
          width: 56, height: 56, background: 'var(--g)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 0 32px rgba(29,158,117,0.3)',
        }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" fill="none" />
          </svg>
        </div>

        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--cream)', marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 24 }}>
          {subtitle}
        </div>

        <div style={{ marginBottom: 16 }}>
          <PinInput
            length={4}
            value={digits}
            onChange={(d) => { setDigits(d) }}
            onComplete={handleComplete}
            hasError={!!error}
            disabled={loading}
            large
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#F7C1C1', marginBottom: 16, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div className="cq-spinner" />
          </div>
        )}

        <button
          onClick={onCancel}
          style={{
            marginTop: 8, background: 'none', border: 'none',
            color: 'var(--text3)', fontSize: 12, cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif', padding: '8px 20px',
            borderRadius: 6, transition: 'color 0.2s',
          }}
          onMouseOver={(e) => { (e.target as HTMLElement).style.color = 'var(--mint)' }}
          onMouseOut={(e) => { (e.target as HTMLElement).style.color = 'var(--text3)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
