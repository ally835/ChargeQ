import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useAppStore, useToast } from '@/store/appStore'
import { sendSMS } from '@/lib/sms'

interface BayTakenModalProps {
  assignedBay: number | null
  onClose: () => void
  onReported: () => void
}

const INCIDENT_TYPES: { id: string; icon: string; label: string }[] = [
  { id: 'non-ev',       icon: '🚗', label: 'Non-EV vehicle' },
  { id: 'ev-no-queue',  icon: '⚡', label: 'EV, not in queue' },
  { id: 'blocked',      icon: '🚧', label: 'Bay blocked' },
  { id: 'other',        icon: '❓', label: 'Other' },
]

export function BayTakenModal({ assignedBay, onClose, onReported }: BayTakenModalProps) {
  const [plate, setPlate] = useState('')
  const [notes, setNotes] = useState('')
  const [incidentType, setIncidentType] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const user = useAuthStore((s) => s.user)
  const siteKey = useAppStore((s) => s.siteKey)
  const siteInfo = useAppStore((s) => s.siteInfo)
  const toast = useToast()

  async function handleSubmit() {
    setLoading(true)
    const { error } = await supabase.from('bay_taken_incidents').insert({
      site_id:        siteKey,
      assigned_bay:   assignedBay ?? 0,
      offender_plate: plate.trim().toUpperCase() || null,
      notes:          notes.trim() || null,
      reported_by:    user?.id ?? null,
      fault_type:     incidentType ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    setLoading(false)

    if (error) {
      toast('Could not submit report. Please try again.')
      return
    }

    // Notify the site manager by SMS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: mobile } = await (supabase as any).rpc('get_site_manager_mobile', { p_site_id: siteKey })
    if (mobile) {
      const plateLabel = plate.trim() ? ` by ${plate.trim().toUpperCase()}` : ''
      const typeLabel  = incidentType ? ` (${incidentType})` : ''
      await sendSMS(
        mobile as string,
        `ChargeQ alert: Bay ${assignedBay ?? '?'} taken${plateLabel}${typeLabel} at ${siteInfo.name}. Driver moved to position 1.`,
      )
    }

    toast('Report submitted. You\'ve been moved to position 1. 🚀')
    onReported()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 12px',
    background: 'var(--bg3)', border: '0.5px solid rgba(29,158,117,0.2)',
    borderRadius: 'var(--rads)', color: 'var(--cream)',
    fontFamily: '"DM Sans", sans-serif', fontSize: 15, outline: 'none',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        zIndex: 700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg2)',
          border: '0.5px solid rgba(226,75,74,0.25)',
          borderTop: '2px solid var(--r)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(24px, env(safe-area-inset-bottom, 24px))',
          width: '100%', maxWidth: 480,
          animation: 'slideSheet 0.3s cubic-bezier(0.2,0.8,0.3,1)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ fontSize: 32 }}>🚫</div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--cream)', marginBottom: 4 }}>
              Someone took my bay
            </div>
            <div style={{ fontSize: 12, color: 'var(--mint)', lineHeight: 1.6 }}>
              Report this so we can alert the site manager and move you to the front of the queue.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid rgba(29,158,117,0.1)', marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--mint)' }}>Your assigned bay</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--cream)' }}>
            {assignedBay != null ? `Bay ${assignedBay}` : 'Unknown'}
          </span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--mint)', marginBottom: 8 }}>
            What type of incident? <span style={{ color: 'var(--text3)' }}>(optional)</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {INCIDENT_TYPES.map((t) => {
              const sel = incidentType === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setIncidentType(sel ? null : t.id)}
                  style={{
                    height: 38, borderRadius: 8, border: `1px solid ${sel ? 'var(--r)' : 'rgba(29,158,117,0.2)'}`,
                    background: sel ? 'rgba(226,75,74,0.15)' : 'var(--bg3)',
                    color: sel ? '#F7C1C1' : 'var(--mint)',
                    fontSize: 12, fontFamily: '"DM Sans", sans-serif',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {t.icon} {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--mint)', marginBottom: 6 }}>
            Offending vehicle plate <span style={{ color: 'var(--text3)' }}>(if you can see it)</span>
          </label>
          <input
            type="text" placeholder="e.g. XYZ 789"
            maxLength={10}
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            style={{
              ...inputStyle,
              fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700,
              textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase',
              height: 48,
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--r)'; e.target.style.boxShadow = '0 0 0 3px rgba(226,75,74,0.1)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(29,158,117,0.2)'; e.target.style.boxShadow = '' }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--mint)', marginBottom: 6, display: 'block' }}>
            Any other details? <span style={{ color: 'var(--text3)' }}>(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Dark blue SUV, no ChargeQ sticker..."
            style={{
              width: '100%', height: 60,
              background: 'var(--bg3)', border: '0.5px solid rgba(29,158,117,0.2)',
              borderRadius: 'var(--rads)', color: 'var(--cream)',
              fontFamily: '"DM Sans", sans-serif', fontSize: 13,
              padding: '10px 12px', resize: 'none', outline: 'none', lineHeight: 1.5,
            }}
          />
        </div>

        <div style={{
          background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)',
          borderRadius: 'var(--rads)', padding: '10px 12px',
          fontSize: 11, color: 'var(--mint)', marginBottom: 8, textAlign: 'center',
        }}>
          🔒 Submitting will alert the site manager and automatically move you to position 1.
        </div>
        <div style={{
          background: 'rgba(226,75,74,0.10)', border: '0.5px solid rgba(226,75,74,0.35)',
          borderRadius: 'var(--rads)', padding: '10px 12px',
          fontSize: 11, color: '#F09A99', marginBottom: 16, textAlign: 'center',
        }}>
          ⚠️ Only use this if your assigned bay is genuinely occupied. False reports are logged.
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', height: 48,
            background: 'var(--r)', color: '#fff', border: 'none',
            borderRadius: 'var(--rads)',
            fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? 'Submitting...' : '🚩 Report & jump to front of queue'}
        </button>
        <button className="btn-secondary" onClick={onClose} style={{ height: 40, fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
