import { useState } from 'react'
import { OtpInput } from './OtpInput'
import { useVerifyOTP, useResendTimer, useSendOTP } from '@/hooks/useAuth'
import { useToast } from '@/store/appStore'

interface OtpVerifyScreenProps {
  phone: string
  onSuccess: (destination: 'welcome' | 'setup') => void
  onBack: () => void
}

export function OtpVerifyScreen({ phone, onSuccess, onBack }: OtpVerifyScreenProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const { verifyOTP, loading, error, clearError } = useVerifyOTP()
  const { sendOTP, loading: resendLoading } = useSendOTP()
  const { seconds, canResend, startTimer } = useResendTimer(30)
  const toast = useToast()

  async function handleComplete(code: string) {
    clearError()
    const result = await verifyOTP(phone, code)
    if (result) {
      onSuccess(result)
    }
    // Error is set inside verifyOTP — OtpInput will clear on re-render with hasError
  }

  async function handleResend() {
    const ok = await sendOTP(phone)
    if (ok) {
      startTimer()
      toast('New code sent! Check your messages.')
    }
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>📱</div>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800,
          color: 'var(--cream)', marginBottom: 6,
        }}>
          Check your messages
        </div>
        <div style={{ fontSize: 13, color: 'var(--mint)', lineHeight: 1.6 }}>
          Code sent to <strong style={{ color: 'var(--cream)' }}>{phone}</strong>
        </div>
      </div>

      <OtpInput
        value={digits}
        onChange={(d) => {
          setDigits(d)
          // Only clear the error when the user is actually typing a digit,
          // not when OtpInput programmatically resets all boxes on error
          if (d.some(Boolean)) clearError()
        }}
        onComplete={handleComplete}
        hasError={!!error}
        disabled={loading}
      />

      {error && (
        <div style={{ textAlign: 'center', fontSize: 13, color: '#F7C1C1', marginBottom: 12, lineHeight: 1.4 }}>
          Incorrect code — please try again or resend.
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div className="cq-spinner" />
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        {canResend ? (
          <button
            onClick={handleResend}
            disabled={resendLoading}
            style={{
              background: 'none', border: 'none',
              color: resendLoading ? 'var(--text3)' : 'var(--teal)',
              fontSize: 13, cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            {resendLoading ? 'Sending...' : 'Resend code'}
          </button>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>
            Resend in {seconds}s
          </span>
        )}
      </div>

      <button className="btn-secondary" onClick={onBack}>
        Use a different number
      </button>
    </div>
  )
}
