import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CHARGER_INFO, PORT_INFO } from '@/utils'
import type { ChargerType, PortSide, Vehicle } from '@/types'
import { useToast } from '@/store/appStore'
import { PortSelector } from './PortSelector'

interface TempVehicleSheetProps {
  onConfirm: (vehicle: Vehicle) => void
  onClose: () => void
}

type LookupState = 'idle' | 'searching' | 'found' | 'not-found' | 'manual'

const CHARGERS: { id: ChargerType; label: string; icon: string; speed: string }[] = [
  { id: 'ccs2',  label: 'CCS2 / DC Fast', icon: '⚡', speed: '50–350 kW' },
  { id: 'type2', label: 'Type 2 / AC',    icon: '🔌', speed: '7–22 kW' },
  { id: 'chd',   label: 'CHAdeMO',         icon: '🔗', speed: '50–100 kW' },
  { id: 'tesla', label: 'Tesla / NACS',    icon: '🚗', speed: 'Up to 250 kW' },
]

const PORTS: { id: PortSide; label: string; icon: string }[] = [
  { id: 'fl', label: 'Front left',    icon: '↖' },
  { id: 'fr', label: 'Front right',   icon: '↗' },
  { id: 'rl', label: 'Rear left',     icon: '↙' },
  { id: 'rr', label: 'Rear right',    icon: '↘' },
  { id: 'dm', label: 'Driver side',   icon: '←' },
  { id: 'pm', label: 'Passenger side',icon: '→' },
]

export function TempVehicleSheet({ onConfirm, onClose }: TempVehicleSheetProps) {
  const [plate, setPlate] = useState('')
  const [lookupState, setLookupState] = useState<LookupState>('idle')
  const [foundVehicle, setFoundVehicle] = useState<{ charger: ChargerType; portSide: PortSide | null; nick: string } | null>(null)
  const [charger, setCharger] = useState<ChargerType | null>(null)
  const [portSide, setPortSide] = useState<PortSide | null>(null)
  const [chargerErr, setChargerErr] = useState(false)
  const [portErr, setPortErr] = useState(false)
  const toast = useToast()

  async function handleLookup() {
    const cleanPlate = plate.trim().toUpperCase().replace(/\s/g, '')
    if (!cleanPlate) return

    setLookupState('searching')

    // Use RPC to look up plate — bypasses RLS so we can find any user's vehicle
    const { data, error } = await supabase
      .rpc('lookup_plate', { p_plate: cleanPlate })

    const rawRow = Array.isArray(data) ? data[0] : data
    const row = rawRow as { charger?: string; port_side?: string | null; nick?: string } | null

    if (!error && row && row.charger) {
      setFoundVehicle({
        charger: row.charger as ChargerType,
        portSide: (row.port_side as PortSide) ?? null,
        nick: row.nick ?? cleanPlate,
      })
      setCharger(row.charger as ChargerType)
      setPortSide((row.port_side as PortSide) ?? null)
      setLookupState('found')
    } else {
      setLookupState('not-found')
    }
  }

  function handleConfirmFound() {
    if (!charger) return
    // Use found data — temp vehicle not saved to user's account
    onConfirm({
      id: `temp_${Date.now()}`,
      plate: plate.trim().toUpperCase(),
      nick: foundVehicle?.nick ?? plate.trim().toUpperCase(),
      charger,
      portSide: portSide ?? undefined,
      isDefault: false,
    })
  }

  function handleConfirmManual() {
    if (!charger) { setChargerErr(true); return }
    if (!portSide) { setPortErr(true); return }
    onConfirm({
      id: `temp_${Date.now()}`,
      plate: plate.trim().toUpperCase(),
      nick: plate.trim().toUpperCase(),
      charger,
      portSide,
      isDefault: false,
    })
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
          🚗 Different car today?
        </div>
        <div style={{ fontSize: 12, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 20 }}>
          Enter the licence plate. If it's in our system we'll fill in the charger details automatically.
        </div>

        {/* ── Plate entry ── */}
        {(lookupState === 'idle' || lookupState === 'searching') && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                Licence plate
              </label>
              <input
                type="text"
                placeholder="e.g. ABC 123"
                autoFocus
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLookup() }}
                style={{
                  width: '100%', height: 56,
                  background: 'var(--bg3)',
                  border: '1.5px solid rgba(29,158,117,0.3)',
                  borderRadius: 14,
                  color: 'var(--cream)',
                  fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700,
                  textAlign: 'center', letterSpacing: '0.12em',
                  outline: 'none', textTransform: 'uppercase',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.12)' }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(29,158,117,0.3)'; e.target.style.boxShadow = '' }}
              />
            </div>

            <button
              onClick={handleLookup}
              disabled={!plate.trim() || lookupState === 'searching'}
              style={{
                width: '100%', height: 50,
                background: plate.trim() ? 'var(--g)' : 'rgba(29,158,117,0.3)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
                cursor: plate.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 10, transition: 'all 0.2s',
              }}
            >
              {lookupState === 'searching'
                ? <><span className="cq-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#fff' }} /> Looking up plate...</>
                : 'Look up plate →'
              }
            </button>
            <button onClick={onClose} className="btn-secondary" style={{ margin: 0 }}>Cancel</button>
          </>
        )}

        {/* ── Plate found — auto-filled details ── */}
        {lookupState === 'found' && foundVehicle && (
          <>
            <div style={{
              background: 'var(--gl)', border: '1.5px solid var(--g)',
              borderRadius: 14, padding: 16, marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ fontSize: 32 }}>
                {CHARGER_INFO[foundVehicle.charger]?.icon ?? '⚡'}
              </div>
              <div>
                <div style={{
                  fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700,
                  color: 'var(--cream)', letterSpacing: '0.08em', marginBottom: 4,
                }}>
                  {plate.trim().toUpperCase()}
                </div>
                <div style={{ fontSize: 13, color: 'var(--teal)', marginBottom: 2 }}>
                  ✓ Found in ChargeQ system
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  <span style={{ fontSize: 11, background: 'var(--gc)', border: '0.5px solid var(--gb)', borderRadius: 6, padding: '2px 8px', color: 'var(--mint)' }}>
                    {CHARGER_INFO[foundVehicle.charger]?.name ?? foundVehicle.charger}
                  </span>
                  {foundVehicle.portSide && (
                    <span style={{ fontSize: 11, background: 'var(--gc)', border: '0.5px solid var(--gb)', borderRadius: 6, padding: '2px 8px', color: 'var(--mint)' }}>
                      {PORT_INFO[foundVehicle.portSide]?.icon} {PORT_INFO[foundVehicle.portSide]?.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* If port side missing, let them pick */}
            {!foundVehicle.portSide && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--amber-t)', marginBottom: 10 }}>
                  ⚠ Port location not on file — please select:
                </div>
                <PortSelector value={portSide} onChange={(p) => setPortSide(p)} />
              </div>
            )}

            <button
              onClick={handleConfirmFound}
              disabled={!foundVehicle.portSide && !portSide}
              style={{
                width: '100%', height: 52,
                background: 'var(--g)', color: '#fff', border: 'none',
                borderRadius: 12,
                fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
                cursor: 'pointer', marginBottom: 10,
                boxShadow: '0 4px 20px rgba(29,158,117,0.35)',
              }}
            >
              ⚡ Yes, join queue with this car
            </button>
            <button onClick={() => setLookupState('idle')} className="btn-secondary" style={{ margin: 0 }}>
              Try a different plate
            </button>
          </>
        )}

        {/* ── Plate not found — manual entry ── */}
        {(lookupState === 'not-found' || lookupState === 'manual') && (
          <>
            <div style={{
              background: 'var(--al)', border: '0.5px solid var(--ab)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              fontSize: 12, color: 'var(--amber-t)', lineHeight: 1.5,
            }}>
              <strong>{plate.trim().toUpperCase()}</strong> isn't in the ChargeQ system yet.
              Select the charger type and port location to continue.
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
              {chargerErr && <div style={{ fontSize: 11, color: '#F7C1C1', marginTop: 4 }}>Please select charger type</div>}
            </div>

            {/* Port location */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Port location <span style={{ color: 'var(--r)' }}>*</span>
              </div>
              <PortSelector value={portSide} onChange={(p) => { setPortSide(p); setPortErr(false) }} hasError={portErr} />
            </div>

            <div style={{
              background: 'var(--gc)', border: '0.5px solid var(--gb)',
              borderRadius: 10, padding: '10px 14px',
              fontSize: 11, color: 'var(--mint)', marginBottom: 14, lineHeight: 1.6,
            }}>
              💡 This is a temporary queue entry for this session only — the car won't be saved to your account.
            </div>

            <button
              onClick={handleConfirmManual}
              style={{
                width: '100%', height: 52,
                background: 'var(--g)', color: '#fff', border: 'none',
                borderRadius: 12,
                fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
                cursor: 'pointer', marginBottom: 10,
                boxShadow: '0 4px 20px rgba(29,158,117,0.35)',
              }}
            >
              ⚡ Join queue with this car
            </button>
            <button onClick={() => setLookupState('idle')} className="btn-secondary" style={{ margin: 0 }}>
              ← Try a different plate
            </button>
          </>
        )}
      </div>
    </div>
  )
}
