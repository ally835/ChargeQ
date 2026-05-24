import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useAppStore, useToast } from '@/store/appStore'

type FaultType = 'not-charging' | 'display-broken' | 'vandalism' | 'cable-missing' | 'blocked' | 'other'

const FAULT_TYPES: { id: FaultType; icon: string; label: string }[] = [
  { id: 'not-charging',   icon: '🔋', label: 'Not charging' },
  { id: 'display-broken', icon: '📵', label: 'Display broken' },
  { id: 'vandalism',      icon: '🚫', label: 'Vandalism / damage' },
  { id: 'cable-missing',  icon: '🔗', label: 'Cable missing' },
  { id: 'blocked',        icon: '🚘', label: 'Bay blocked / ICEd' },
  { id: 'other',          icon: '❕', label: 'Other issue' },
]

const FAULT_LABELS: Record<FaultType, string> = {
  'not-charging':   'Not charging / no power',
  'display-broken': 'Display / screen broken',
  'vandalism':      'Vandalism or physical damage',
  'cable-missing':  'Cable missing or cut',
  'blocked':        'Bay blocked / ICEd vehicle',
  'other':          'Other issue',
}

interface FaultReportModalProps {
  defaultBayNum?: number | null
  onClose: () => void
}

export function FaultReportModal({ defaultBayNum, onClose }: FaultReportModalProps) {
  const [faultType, setFaultType] = useState<FaultType | null>(null)
  const [bayNum, setBayNum] = useState(defaultBayNum != null ? String(defaultBayNum) : '')
  const [description, setDescription] = useState('')
  const [photoData, setPhotoData] = useState<string | null>(null)
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [typeErr, setTypeErr] = useState(false)

  const user = useAuthStore((s) => s.user)
  const siteKey = useAppStore((s) => s.siteKey)
  const toast = useToast()

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => { setPhotoData(ev.target?.result as string) }
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    if (!faultType) { setTypeErr(true); return }
    setLoading(true)

    const { error } = await supabase.from('fault_reports').insert({
      site_id:     siteKey,
      bay_num:     bayNum ? parseInt(bayNum) : null,
      fault_type:  FAULT_LABELS[faultType],
      description: description.trim() || null,
      photo_url:   null, // Phase 5 will add storage upload
      reported_by: user?.id ?? null,
    })

    setLoading(false)
    if (error) {
      toast('Could not submit report. Please try again.')
      return
    }

    toast('Fault report submitted. Site operator has been notified. ⚠️')
    onClose()
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
          border: '0.5px solid rgba(239,159,39,0.25)',
          borderTop: '2px solid var(--a)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(24px, env(safe-area-inset-bottom, 24px))',
          width: '100%', maxWidth: 480,
          animation: 'slideSheet 0.3s cubic-bezier(0.2,0.8,0.3,1)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--amber-t)', marginBottom: 4 }}>
          ⚠️ Report a bay problem
        </div>
        <div style={{ fontSize: 12, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 16 }}>
          Help us keep this site running. Your report goes directly to the site operator and ChargeQ.
        </div>

        {/* Fault type grid */}
        <div style={{ fontSize: 10, color: 'var(--teal)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          What is the issue?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {FAULT_TYPES.map((ft) => {
            const sel = faultType === ft.id
            return (
              <button
                key={ft.id}
                onClick={() => { setFaultType(ft.id); setTypeErr(false) }}
                style={{
                  border: `1.5px solid ${sel ? 'var(--a)' : typeErr ? 'var(--r)' : 'rgba(239,159,39,0.2)'}`,
                  borderRadius: 'var(--rads)', padding: '10px 8px',
                  cursor: 'pointer', background: sel ? 'var(--al)' : 'var(--bg3)',
                  textAlign: 'center', transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 20, marginBottom: 4, display: 'block' }}>{ft.icon}</span>
                <span style={{ fontSize: 11, color: sel ? 'var(--amber-t)' : 'var(--mint)' }}>{ft.label}</span>
              </button>
            )
          })}
        </div>
        {typeErr && <div style={{ fontSize: 11, color: '#F7C1C1', marginBottom: 8 }}>Please select the type of issue</div>}

        {/* Bay number */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--mint)', marginBottom: 6 }}>
            Bay number <span style={{ color: 'var(--text3)' }}>(if known)</span>
          </label>
          <input
            type="tel" inputMode="numeric" placeholder="e.g. 3"
            value={bayNum} onChange={(e) => setBayNum(e.target.value)}
            style={{
              width: '100%', height: 42,
              background: 'var(--bg3)', border: '0.5px solid rgba(239,159,39,0.2)',
              borderRadius: 'var(--rads)', color: 'var(--cream)',
              fontFamily: '"DM Sans", sans-serif', fontSize: 15,
              padding: '0 12px', outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--a)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(239,159,39,0.2)' }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--mint)', marginBottom: 6 }}>
            Description <span style={{ color: 'var(--text3)' }}>(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Cable connector is damaged, screen shows error E04..."
            style={{
              width: '100%', height: 72,
              background: 'var(--bg3)', border: '0.5px solid rgba(239,159,39,0.2)',
              borderRadius: 'var(--rads)', color: 'var(--cream)',
              fontFamily: '"DM Sans", sans-serif', fontSize: 13,
              padding: '10px 12px', resize: 'none', outline: 'none', lineHeight: 1.5,
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--a)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(239,159,39,0.2)' }}
          />
        </div>

        {/* Photo upload */}
        <div style={{
          border: `1.5px dashed ${photoData ? 'var(--a)' : 'rgba(239,159,39,0.3)'}`,
          borderRadius: 'var(--rads)', padding: 16, textAlign: 'center',
          cursor: 'pointer', background: photoData ? 'var(--al)' : 'var(--bg3)',
          marginBottom: 12, position: 'relative', transition: 'all 0.2s',
        }}>
          <input
            type="file" accept="image/*" capture="environment"
            onChange={handlePhoto}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
          />
          <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>
            {photoData ? '✅' : '📷'}
          </span>
          <div style={{ fontSize: 12, color: 'var(--mint)' }}>
            {photoData ? `Photo added${photoName ? ` — ${photoName}` : ''} — tap to change` : 'Tap to add a photo (optional)'}
          </div>
          {photoData && (
            <img
              src={photoData}
              alt="Fault photo preview"
              style={{
                width: '100%', maxHeight: 120, objectFit: 'cover',
                borderRadius: 8, marginTop: 8,
                border: '0.5px solid rgba(239,159,39,0.3)',
              }}
            />
          )}
        </div>

        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginBottom: 14, lineHeight: 1.5 }}>
          Reports are sent to the site operator and ChargeQ support team.
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', height: 48,
            background: 'var(--a)', color: '#fff', border: 'none',
            borderRadius: 'var(--rads)',
            fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? 'Submitting...' : '🚩 Submit fault report'}
        </button>
        <button className="btn-secondary" onClick={onClose} style={{ height: 40, fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
