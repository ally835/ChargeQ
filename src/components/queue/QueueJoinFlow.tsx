import { useState } from 'react'
import type { ChargerType, PortSide } from '@/types'
import { CHARGER_INFO } from '@/utils'
import { useAuthStore } from '@/store/authStore'
import { PortSelector } from './PortSelector'

const CHARGERS: ChargerType[] = ['ccs2', 'type2', 'chd', 'tesla']

interface QueueJoinFlowProps {
  onSubmit: (charger: ChargerType, port: PortSide) => void
  onBack: () => void
  loading?: boolean
  error?: string | null
}

export function QueueJoinFlow({ onSubmit, onBack, loading, error }: QueueJoinFlowProps) {
  const user = useAuthStore((s) => s.user)
  const selectedVehicle = user?.vehicles.find((v) => v.id === user.selectedVehicleId)
    ?? user?.vehicles[0]

  // Pre-select charger from vehicle if known
  const [step, setStep] = useState(1)
  const [charger, setCharger] = useState<ChargerType | null>(selectedVehicle?.charger ?? null)
  const [port, setPort] = useState<PortSide | null>(selectedVehicle?.portSide ?? null)
  const [chargerErr, setChargerErr] = useState(false)
  const [portErr, setPortErr] = useState(false)

  function handleStep1Next() {
    if (!charger) { setChargerErr(true); return }
    setChargerErr(false)
    setStep(2)
  }

  function handleSubmit() {
    if (!port) { setPortErr(true); return }
    if (!charger) { setStep(1); return }
    setPortErr(false)
    onSubmit(charger, port)
  }

  const stepDot = (n: number) => (
    <div key={n} style={{
      width: 28, height: 3, borderRadius: 2,
      background: step >= n ? 'var(--g)' : 'rgba(255,255,255,0.12)',
      transition: 'background 0.3s',
    }} />
  )

  // ── Step 1: Charger type ──────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={{ padding: 16, animation: 'slideUp 0.25s ease' }}>
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 16 }}>
          {[1, 2, 3].map(stepDot)}
        </div>

        <div className="cq-card">
          <div className="section-label">Charger type</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CHARGERS.map((id) => {
              const info = CHARGER_INFO[id]
              const sel = charger === id
              return (
                <button
                  key={id}
                  data-id={id}
                  onClick={() => { setCharger(id); setChargerErr(false) }}
                  style={{
                    border: `1.5px solid ${sel ? 'var(--g)' : chargerErr ? 'var(--r)' : 'rgba(29,158,117,0.2)'}`,
                    borderRadius: 'var(--rads)',
                    padding: '12px 10px',
                    cursor: 'pointer',
                    background: sel ? 'var(--gl)' : 'var(--bg3)',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{info.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: sel ? 'var(--teal)' : 'var(--cream)' }}>
                    {info.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--mint)' }}>{info.speed}</div>
                </button>
              )
            })}
          </div>
          {chargerErr && (
            <div style={{ fontSize: 11, color: '#F7C1C1', marginTop: 6 }}>
              Please select your charger type
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={handleStep1Next}>
          Next — port location →
        </button>
        <button className="btn-secondary" onClick={onBack}>
          Back
        </button>
      </div>
    )
  }

  // ── Step 2: Port location ─────────────────────────────────────────
  return (
    <div style={{ padding: 16, animation: 'slideUp 0.25s ease' }}>
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 16 }}>
        {[1, 2, 3].map(stepDot)}
      </div>

      <div className="cq-card">
        <div className="section-label">Port location on your car</div>
        <p style={{ fontSize: 12, color: 'var(--mint)', marginBottom: 12, lineHeight: 1.5 }}>
          Helps us match you to the right bay
        </p>
        <PortSelector
          value={port}
          onChange={(p) => { setPort(p); setPortErr(false) }}
          hasError={portErr}
        />
      </div>

      {error && (
        <div style={{
          background: 'var(--rl)', border: '0.5px solid var(--rb)',
          borderRadius: 'var(--rads)', padding: '10px 12px',
          fontSize: 12, color: '#F7C1C1', marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <><span className="cq-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Joining queue...</>
          : 'Find my best bay ⚡'
        }
      </button>
      <button className="btn-secondary" onClick={() => setStep(1)}>
        Back
      </button>
    </div>
  )
}
