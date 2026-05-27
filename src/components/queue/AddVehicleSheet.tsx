import { useState } from 'react'
import { useAddVehicle } from '@/hooks/useAuth'
import { PortSelector } from './PortSelector'
import type { ChargerType, PortSide, Vehicle } from '@/types'

interface AddVehicleSheetProps {
  onConfirm: (vehicle: Vehicle) => void
  onClose: () => void
}

const CHARGERS: { id: ChargerType; label: string; icon: string; speed: string }[] = [
  { id: 'ccs2',  label: 'CCS2 / DC Fast', icon: '⚡', speed: '50–350 kW' },
  { id: 'type2', label: 'Type 2 / AC',    icon: '🔌', speed: '7–22 kW' },
  { id: 'chd',   label: 'CHAdeMO',         icon: '🔗', speed: '50–100 kW' },
  { id: 'tesla', label: 'Tesla / NACS',    icon: '🚗', speed: 'Up to 250 kW' },
]

export function AddVehicleSheet({ onConfirm, onClose }: AddVehicleSheetProps) {
  const [plate, setPlate] = useState('')
  const [nick, setNick] = useState('')
  const [charger, setCharger] = useState<ChargerType | null>(null)
  const [portSide, setPortSide] = useState<PortSide | null>(null)
  const [chargerErr, setChargerErr] = useState(false)
  const [portErr, setPortErr] = useState(false)
  const [plateErr, setPlateErr] = useState(false)
  const { addVehicleToAccount, loading } = useAddVehicle()

  async function handleConfirm() {
    const cleanPlate = plate.trim().toUpperCase()
    if (!cleanPlate) { setPlateErr(true); return }
    if (!charger) { setChargerErr(true); return }
    if (!portSide) { setPortErr(true); return }

    const vehicle = await addVehicleToAccount({
      plate: cleanPlate,
      nick: nick.trim() || cleanPlate,
      charger,
      portSide,
    })

    if (vehicle) onConfirm(vehicle)
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
          border: '0.5px solid rgba(29,158,117,0.25)',
          borderTop: '2px solid var(--g)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(24px, env(safe-area-inset-bottom, 24px))',
          width: '100%', maxWidth: 480,
          animation: 'slideSheet 0.3s cubic-bezier(0.2,0.8,0.3,1)',
          maxHeight: '92vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />

        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 4 }}>
          🏠 Add to My Garage
        </div>
        <div style={{ fontSize: 12, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 20 }}>
          This car will be saved to your account for future visits.
        </div>

        {/* Licence plate */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Licence plate <span style={{ color: 'var(--r)' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. ABC 123"
            autoFocus
            value={plate}
            onChange={(e) => { setPlate(e.target.value.toUpperCase()); setPlateErr(false) }}
            style={{
              width: '100%', height: 52,
              background: 'var(--bg3)',
              border: `1.5px solid ${plateErr ? 'var(--r)' : 'rgba(29,158,117,0.3)'}`,
              borderRadius: 14,
              color: 'var(--cream)',
              fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700,
              textAlign: 'center', letterSpacing: '0.12em',
              outline: 'none', textTransform: 'uppercase',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.12)' }}
            onBlur={(e) => { e.target.style.borderColor = plateErr ? 'var(--r)' : 'rgba(29,158,117,0.3)'; e.target.style.boxShadow = '' }}
          />
          {plateErr && <div style={{ fontSize: 11, color: '#F7C1C1', marginTop: 4 }}>Please enter a licence plate</div>}
        </div>

        {/* Nickname */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Nickname <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. My Tesla, Work Car"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            style={{
              width: '100%', height: 44,
              background: 'var(--bg3)',
              border: '1.5px solid rgba(29,158,117,0.3)',
              borderRadius: 12,
              color: 'var(--cream)',
              fontFamily: '"DM Sans", sans-serif', fontSize: 14,
              padding: '0 14px',
              outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--g)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(29,158,117,0.3)' }}
          />
        </div>

        {/* Charger type */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            Charger type <span style={{ color: 'var(--r)' }}>*</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CHARGERS.map((c) => (
              <button key={c.id} onClick={() => { setCharger(c.id); setChargerErr(false) }} style={{
                border: `1.5px solid ${charger === c.id ? 'var(--g)' : chargerErr ? 'var(--r)' : 'rgba(29,158,117,0.2)'}`,
                borderRadius: 12, padding: '12px 10px', cursor: 'pointer', textAlign: 'left',
                background: charger === c.id ? 'var(--gl)' : 'var(--bg3)', transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{c.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: charger === c.id ? 'var(--teal)' : 'var(--cream)' }}>{c.label}</div>
                <div style={{ fontSize: 10, color: 'var(--mint)' }}>{c.speed}</div>
              </button>
            ))}
          </div>
          {chargerErr && <div style={{ fontSize: 11, color: '#F7C1C1', marginTop: 4 }}>Please select a charger type</div>}
        </div>

        {/* Port location */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            Charging port location <span style={{ color: 'var(--r)' }}>*</span>
          </div>
          <PortSelector value={portSide} onChange={(p) => { setPortSide(p); setPortErr(false) }} hasError={portErr} />
        </div>

        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            width: '100%', height: 52,
            background: 'var(--g)', color: '#fff', border: 'none',
            borderRadius: 12,
            fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 10,
            boxShadow: '0 4px 20px rgba(29,158,117,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? <><span className="cq-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#fff' }} /> Saving...</>
            : '⚡ Save & Join Queue'
          }
        </button>
        <button onClick={onClose} className="btn-secondary" style={{ margin: 0 }}>Cancel</button>
      </div>
    </div>
  )
}
