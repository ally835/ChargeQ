import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/store/appStore'

const FLAG_REASONS = [
  { id: 'no-chargeq',  icon: '⚡', label: 'No ChargeQ installed' },
  { id: 'bays-busy',   icon: '🔴', label: 'High demand — always full' },
  { id: 'no-bays',     icon: '🚫', label: 'No EV bays at all' },
  { id: 'qr-missing',  icon: '📷', label: 'QR code missing / damaged' },
  { id: 'wrong-info',  icon: '❓', label: 'Incorrect information shown' },
]

interface FlagLocationModalProps {
  stationName: string
  lat: number | null
  lng: number | null
  onClose: () => void
  defaultReason?: string
}

export function FlagLocationModal({ stationName, lat, lng, onClose, defaultReason }: FlagLocationModalProps) {
  const [reason, setReason] = useState<string | null>(defaultReason ?? null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const user = useAuthStore((s) => s.user)
  const toast = useToast()

  async function handleSubmit() {
    if (!reason) return
    setLoading(true)

    const reasonLabel = FLAG_REASONS.find((r) => r.id === reason)?.label ?? reason

    const { error } = await supabase.from('location_flags').insert({
      station_name: stationName,
      reason:       reasonLabel,
      notes:        notes.trim() || null,
      lat:          lat,
      lng:          lng,
      reported_by:  user?.id ?? null,
    })

    setLoading(false)

    if (error) {
      toast('Could not submit report. Please try again.')
      return
    }

    toast("Flag submitted — thanks! We'll follow up with the site.")
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
          border: '0.5px solid rgba(226,75,74,0.2)',
          borderTop: '2px solid var(--r)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(24px, env(safe-area-inset-bottom, 24px))',
          width: '100%', maxWidth: 480,
          animation: 'slideSheet 0.3s cubic-bezier(0.2,0.8,0.3,1)',
          maxHeight: '85vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />

        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--cream)', marginBottom: 4 }}>
          🚩 Flag this location
        </div>
        <div style={{ fontSize: 12, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 16 }}>
          Help us reach out to <strong style={{ color: 'var(--cream)' }}>{stationName}</strong> about installing ChargeQ.
        </div>

        <div style={{ fontSize: 10, color: 'var(--teal)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          What is the issue?
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {FLAG_REASONS.map((fr) => (
            <button
              key={fr.id}
              onClick={() => setReason(fr.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px',
                background: reason === fr.id ? 'var(--rl)' : 'var(--bg3)',
                border: `1.5px solid ${reason === fr.id ? 'var(--r)' : 'rgba(226,75,74,0.2)'}`,
                borderRadius: 'var(--rads)', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 20 }}>{fr.icon}</span>
              <span style={{ fontSize: 13, color: reason === fr.id ? '#F7C1C1' : 'var(--cream)' }}>{fr.label}</span>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--mint)', marginBottom: 6 }}>
            Additional notes <span style={{ color: 'var(--text3)' }}>(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 50+ EV charging spots, very busy weekday mornings..."
            style={{
              width: '100%', height: 72,
              background: 'var(--bg3)', border: '0.5px solid rgba(226,75,74,0.2)',
              borderRadius: 'var(--rads)', color: 'var(--cream)',
              fontFamily: '"DM Sans", sans-serif', fontSize: 13,
              padding: '10px 12px', resize: 'none', outline: 'none', lineHeight: 1.5,
            }}
          />
        </div>

        <div style={{
          background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)',
          borderRadius: 'var(--rads)', padding: '10px 12px',
          fontSize: 11, color: 'var(--mint)', marginBottom: 14, lineHeight: 1.6, textAlign: 'center',
        }}>
          Reports are sent to ChargeQ to help us prioritise new site installations.
          We'll reach out to the site owner on your behalf.
        </div>

        <button
          onClick={handleSubmit}
          disabled={!reason || loading}
          style={{
            width: '100%', height: 48,
            background: reason ? 'var(--r)' : 'rgba(226,75,74,0.3)',
            color: '#fff', border: 'none',
            borderRadius: 'var(--rads)',
            fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
            cursor: reason ? 'pointer' : 'not-allowed', marginBottom: 8,
            opacity: loading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? 'Submitting...' : '🚩 Submit flag'}
        </button>
        <button className="btn-secondary" onClick={onClose} style={{ height: 40, fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
