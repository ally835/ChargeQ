import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/store/appStore'

interface Props {
  role: 'driver' | 'manager' | 'superadmin'
  siteKey?: string
  onClose: () => void
}

export function FeedbackModal({ role, siteKey, onClose }: Props) {
  const toast = useToast()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!rating) return
    setSubmitting(true)
    const { error } = await (supabase as any).from('feedback').insert({
      rating,
      message: message.trim() || null,
      site_key: siteKey ?? null,
      role,
    })
    setSubmitting(false)
    if (error) {
      console.error('[feedback] insert error', error)
      toast('Could not submit feedback. Please try again.')
      return
    }
    toast('Thanks for your feedback!')
    onClose()
  }

  const active = hover || rating

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', background: 'var(--surf)',
          borderRadius: '16px 16px 0 0',
          border: '0.5px solid rgba(29,158,117,0.2)',
          padding: '20px 18px 36px',
          animation: 'slideUp 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--cream)', marginBottom: 4 }}>
            Leave feedback
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            Help us improve ChargeQ
          </div>
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                fontSize: 30, lineHeight: 1,
                color: '#FFD166',
                opacity: active >= star ? 1 : 0.2,
                transform: active >= star ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.12s',
              }}
            >
              ★
            </button>
          ))}
        </div>

        {/* Message */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Any thoughts? (optional)"
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--gc)', border: '0.5px solid rgba(29,158,117,0.2)',
            borderRadius: 10, padding: '10px 12px',
            color: 'var(--cream)', fontSize: 13,
            fontFamily: '"DM Sans", sans-serif',
            resize: 'none', outline: 'none',
            marginBottom: 14,
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={!rating || submitting}
          style={{
            width: '100%', height: 46,
            background: rating ? 'var(--g)' : 'rgba(29,158,117,0.2)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
            cursor: rating ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.2s',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting
            ? <><span className="cq-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Sending…</>
            : 'Send feedback'
          }
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 10, height: 36,
            background: 'transparent', border: 'none',
            color: 'var(--text3)', fontSize: 12,
            fontFamily: '"DM Sans", sans-serif', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
