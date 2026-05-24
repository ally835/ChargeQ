import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useAppStore, useToast } from '@/store/appStore'

interface FeedbackModalProps {
  onClose: () => void
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const user = useAuthStore((s) => s.user)
  const siteKey = useAppStore((s) => s.siteKey)
  const toast = useToast()

  async function handleSubmit() {
    if (!rating) return
    setLoading(true)

    const { error } = await supabase.from('feedback').insert({
      rating,
      message: message.trim() || null,
      site_key: siteKey,
      user_id: user?.id ?? null,
    })

    setLoading(false)

    if (error) {
      toast('Could not submit feedback. Please try again.')
      return
    }

    toast('Thanks for your feedback! 💚')
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        zIndex: 900, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg2)',
          border: '0.5px solid rgba(29,158,117,0.25)',
          borderTop: '2px solid var(--g)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(24px, env(safe-area-inset-bottom, 24px))',
          width: '100%', maxWidth: 480,
          animation: 'slideSheet 0.3s cubic-bezier(0.2,0.8,0.3,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />

        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--cream)', marginBottom: 4 }}>
          Share feedback
        </div>
        <div style={{ fontSize: 12, color: 'var(--mint)', marginBottom: 18, lineHeight: 1.6 }}>
          How was your experience with ChargeQ today?
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 36, padding: 2, lineHeight: 1,
                opacity: rating >= star ? 1 : 0.25,
                transition: 'opacity 0.15s, transform 0.1s',
                transform: rating >= star ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              ⭐
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--mint)', marginBottom: 6 }}>
            Tell us more <span style={{ color: 'var(--text3)' }}>(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What went well? What could be better?"
            style={{
              width: '100%', height: 80,
              background: 'var(--bg3)', border: '0.5px solid rgba(29,158,117,0.2)',
              borderRadius: 'var(--rads)', color: 'var(--cream)',
              fontFamily: '"DM Sans", sans-serif', fontSize: 13,
              padding: '10px 12px', resize: 'none', outline: 'none',
              lineHeight: 1.5, boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!rating || loading}
          style={{
            width: '100%', height: 48,
            background: rating ? 'var(--g)' : 'rgba(29,158,117,0.3)',
            color: '#fff', border: 'none',
            borderRadius: 'var(--rads)',
            fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
            cursor: rating ? 'pointer' : 'not-allowed',
            marginBottom: 8, opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Submitting...' : 'Submit feedback'}
        </button>
        <button className="btn-secondary" onClick={onClose} style={{ height: 40, fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
