import { useState } from 'react'
import { useCreateAccount } from '@/hooks/useAuth'
import type { ChargerType, PortSide } from '@/types'
import { CHARGER_INFO } from '@/utils'
import { PortSelector } from '@/components/queue/PortSelector'

interface AccountSetupScreenProps {
  onComplete: () => void
}

const CHARGERS: { id: ChargerType; label: string; speed: string }[] = [
  { id: 'ccs2',  label: 'CCS2 / DC Fast', speed: '50–350 kW' },
  { id: 'type2', label: 'Type 2 / AC',    speed: '7–22 kW' },
  { id: 'chd',   label: 'CHAdeMO',         speed: '50–100 kW' },
  { id: 'tesla', label: 'Tesla / NACS',    speed: 'Up to 250 kW' },
]

const PORTS: { id: PortSide; label: string; icon: string }[] = [
  { id: 'fl', label: 'Front left',    icon: '↖' },
  { id: 'fr', label: 'Front right',   icon: '↗' },
  { id: 'rl', label: 'Rear left',     icon: '↙' },
  { id: 'rr', label: 'Rear right',    icon: '↘' },
  { id: 'dm', label: 'Driver side',   icon: '←' },
  { id: 'pm', label: 'Passenger side',icon: '→' },
]

// Step indicator
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 24 : 8, height: 8,
          borderRadius: 4,
          background: i === current ? 'var(--g)' : i < current ? 'rgba(29,158,117,0.4)' : 'rgba(255,255,255,0.1)',
          transition: 'all 0.3s',
        }} />
      ))}
    </div>
  )
}

export function AccountSetupScreen({ onComplete }: AccountSetupScreenProps) {
  const [step, setStep] = useState(0) // 0=name, 1=vehicle, 2=charger, 3=port
  const [name, setName] = useState('')
  const [plate, setPlate] = useState('')
  const [nick, setNick] = useState('')
  const [charger, setCharger] = useState<ChargerType | ''>('')
  const [portSide, setPortSide] = useState<PortSide | ''>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { createAccount, loading, error: serverError } = useCreateAccount()

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 52, padding: '0 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1.5px solid rgba(29,158,117,0.25)',
    borderRadius: 'var(--rads)', color: 'var(--cream)',
    fontFamily: '"DM Sans", sans-serif', fontSize: 16, outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    WebkitAppearance: 'none',
  }

  function validateStep(): boolean {
    const e: Record<string, string> = {}
    if (step === 0 && (!name.trim() || name.trim().length < 2)) e.name = 'Please enter your name'
    if (step === 1 && !plate.trim()) e.plate = 'Please enter your plate number'
    if (step === 2 && !charger) e.charger = 'Please select your charger type'
    if (step === 3 && !portSide) e.portSide = 'Please select your charge port location'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleNext() {
    if (!validateStep()) return
    if (step < 3) { setStep(step + 1); return }
    // Final step — submit
    const ok = await createAccount({
      name, plate, nick,
      charger: charger as ChargerType,
      portSide: portSide ? portSide as PortSide : undefined,
    })
    if (ok) onComplete()
  }

  const stepTitles = ['Your name', 'Your vehicle', 'Charger type', 'Port location']
  const stepSubtitles = [
    'How should we address you?',
    'We\'ll use this to match you to the right bay',
    'What type of charger does your car use?',
    'Where is the charging port on your car?',
  ]

  return (
    <div style={{
      minHeight: '100%',
      background: 'linear-gradient(180deg, #1a4a28 0%, var(--bg) 40%)',
      padding: '20px 20px 32px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, background: 'var(--g)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: '0 0 32px rgba(29,158,117,0.4)',
        }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
            <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13Z"/>
          </svg>
        </div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
          {stepTitles[step]}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
          {stepSubtitles[step]}
        </div>
      </div>

      <StepDots current={step} total={4} />

      {/* Step 0: Name */}
      {step === 0 && (
        <div>
          <input
            type="text"
            placeholder="e.g. Sarah Mitchell"
            autoComplete="name"
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors({}) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNext() }}
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.15)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(29,158,117,0.25)'; e.target.style.boxShadow = '' }}
          />
          {errors.name && <div style={{ fontSize: 12, color: '#F7C1C1', marginTop: 6 }}>{errors.name}</div>}
        </div>
      )}

      {/* Step 1: Vehicle */}
      {step === 1 && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6, letterSpacing: '0.05em' }}>
              LICENCE PLATE *
            </label>
            <input
              type="text"
              placeholder="e.g. ABC 123"
              autoComplete="off"
              autoFocus
              value={plate}
              onChange={(e) => { setPlate(e.target.value.toUpperCase()); setErrors({}) }}
              style={{ ...inputStyle, textTransform: 'uppercase', fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.08em' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.15)' }}
              onBlur={(e) => { e.target.style.borderColor = errors.plate ? 'var(--r)' : 'rgba(29,158,117,0.25)'; e.target.style.boxShadow = '' }}
            />
            {errors.plate && <div style={{ fontSize: 12, color: '#F7C1C1', marginTop: 6 }}>{errors.plate}</div>}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6, letterSpacing: '0.05em' }}>
              NICKNAME <span style={{ opacity: 0.5 }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. My Tesla, Work car"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.15)' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(29,158,117,0.25)'; e.target.style.boxShadow = '' }}
            />
          </div>
        </div>
      )}

      {/* Step 2: Charger type */}
      {step === 2 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {CHARGERS.map((c) => {
              const sel = charger === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => { setCharger(c.id); setErrors({}) }}
                  style={{
                    border: `2px solid ${sel ? 'var(--g)' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 14,
                    padding: '16px 12px',
                    cursor: 'pointer',
                    background: sel ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.04)',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{CHARGER_INFO[c.id].icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: sel ? 'var(--mint)' : '#fff', marginBottom: 2 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{c.speed}</div>
                </button>
              )
            })}
          </div>
          {errors.charger && <div style={{ fontSize: 12, color: '#F7C1C1', marginTop: 8 }}>{errors.charger}</div>}
        </div>
      )}

      {/* Step 3: Port location */}
      {step === 3 && (
        <div>
          <PortSelector
            value={portSide}
            onChange={(p) => { setPortSide(p); setErrors({}) }}
            hasError={!!errors.portSide}
          />
          {errors.portSide && <div style={{ fontSize: 12, color: '#F7C1C1', marginTop: 8 }}>{errors.portSide}</div>}
        </div>
      )}

      {/* Error */}
      {serverError && (
        <div style={{
          background: 'rgba(226,75,74,0.15)', border: '0.5px solid rgba(226,75,74,0.4)',
          borderRadius: 10, padding: '10px 14px',
          fontSize: 13, color: '#F7C1C1', marginTop: 16,
        }}>
          {serverError}
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: 24 }}>
        <button
          onClick={handleNext}
          disabled={loading}
          style={{
            width: '100%', height: 56,
            background: 'var(--g)', color: '#fff',
            border: 'none', borderRadius: 14,
            fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800,
            cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 4px 20px rgba(29,158,117,0.35)',
          }}
          onMouseOver={(e) => { (e.currentTarget).style.background = 'var(--gm)' }}
          onMouseOut={(e) => { (e.currentTarget).style.background = 'var(--g)' }}
        >
          {loading
            ? <><span className="cq-spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff' }} /> Setting up...</>
            : step < 3
            ? <>Next <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg></>
            : 'Create account ⚡'
          }
        </button>

        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            style={{
              width: '100%', height: 44, marginTop: 10,
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.4)', fontSize: 13,
              cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
            }}
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}
