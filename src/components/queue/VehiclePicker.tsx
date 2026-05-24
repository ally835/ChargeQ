import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { CHARGER_INFO, PORT_INFO } from '@/utils'
import { TempVehicleSheet } from './TempVehicleSheet'
import type { Vehicle } from '@/types'

interface VehiclePickerProps {
  onPick: (vehicle: Vehicle) => void
  loading?: boolean
  error?: string | null
  onFindNearby?: (chargerType: string) => void
}

export function VehiclePicker({ onPick, loading, error, onFindNearby }: VehiclePickerProps) {
  const user = useAuthStore((s) => s.user)
  const [selected, setSelected] = useState<string | null>(null)
  const [showTempSheet, setShowTempSheet] = useState(false)

  if (!user) return null
  const vehicles = user.vehicles

  return (
    <>
      <div style={{ padding: '20px 16px', animation: 'slideUp 0.3s cubic-bezier(0.2,0.8,0.3,1)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56,
            background: 'var(--gc)', border: '1.5px solid var(--gb)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: 26,
          }}>
            🚗
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--cream)', marginBottom: 6 }}>
            Which car today?
          </div>
          <div style={{ fontSize: 13, color: 'var(--mint)', lineHeight: 1.6 }}>
            Select the vehicle joining the queue
          </div>
        </div>

        {/* Vehicle options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {vehicles.map((v) => {
            const chargerInfo = CHARGER_INFO[v.charger]
            const portInfo = v.portSide ? PORT_INFO[v.portSide] : null
            const isSelected = selected === v.id

            return (
              <button
                key={v.id}
                onClick={() => setSelected(v.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 14px',
                  background: isSelected ? 'var(--gl)' : 'var(--surf)',
                  border: `${isSelected ? '2px' : '0.5px'} solid ${isSelected ? 'var(--g)' : 'rgba(29,158,117,0.2)'}`,
                  borderRadius: 14,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.2s',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {isSelected && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.4), transparent)' }} />
                )}

                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: isSelected ? 'rgba(29,158,117,0.2)' : 'var(--bg3)',
                  border: `0.5px solid ${isSelected ? 'var(--gb)' : 'rgba(29,158,117,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, flexShrink: 0, transition: 'all 0.2s',
                }}>
                  {chargerInfo?.icon ?? '⚡'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--cream)', letterSpacing: '0.05em', marginBottom: 3 }}>
                    {v.plate}
                  </div>
                  {v.nick !== v.plate && (
                    <div style={{ fontSize: 12, color: 'var(--mint)', marginBottom: 3 }}>{v.nick}</div>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: isSelected ? 'var(--teal)' : 'var(--mint)', background: 'var(--gc)', borderRadius: 6, padding: '2px 8px', border: '0.5px solid rgba(29,158,117,0.2)' }}>
                      {chargerInfo?.name ?? v.charger}
                    </span>
                    {portInfo && (
                      <span style={{ fontSize: 11, color: 'var(--mint)', background: 'var(--gc)', borderRadius: 6, padding: '2px 8px', border: '0.5px solid rgba(29,158,117,0.2)' }}>
                        {portInfo.icon} {portInfo.label}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--g)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Different car option */}
        <button
          onClick={() => setShowTempSheet(true)}
          style={{
            width: '100%', height: 44, marginBottom: 16,
            background: 'var(--bg3)',
            border: '1px dashed rgba(29,158,117,0.3)',
            borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: '"DM Sans", sans-serif', fontSize: 13,
            color: 'var(--mint)', transition: 'all 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--g)'; e.currentTarget.style.background = 'var(--gc)' }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(29,158,117,0.3)'; e.currentTarget.style.background = 'var(--bg3)' }}
        >
          <span style={{ fontSize: 18 }}>🚗</span>
          I'm in a different car today
        </button>

        {error && error === 'no_compatible_bay' && (() => {
          const selectedVehicle = vehicles.find((v) => v.id === selected) ?? vehicles[0]
          const chargerInfo: Record<string,string> = { ccs2:'CCS2 / DC Fast', type2:'Type 2 AC', chd:'CHAdeMO', tesla:'Tesla / NACS' }
          const chargerLabel = selectedVehicle?.charger ? (chargerInfo[selectedVehicle.charger] ?? selectedVehicle.charger.toUpperCase()) : 'your charger type'
          return (
            <div style={{ background: 'rgba(239,159,39,0.1)', border: '0.5px solid rgba(239,159,39,0.4)', borderRadius: 'var(--rad)', padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>⚡</span>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#FAC775', marginBottom: 4 }}>
                    No compatible charger at this location
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(250,199,117,0.8)', lineHeight: 1.5 }}>
                    This station doesn't have a <strong>{chargerLabel}</strong> bay. Let us find the nearest station that does.
                  </div>
                </div>
              </div>
              {onFindNearby && selectedVehicle?.charger && (
                <button
                  onClick={() => onFindNearby(selectedVehicle.charger!)}
                  style={{
                    width: '100%', height: 44,
                    background: 'rgba(239,159,39,0.2)', border: '1px solid rgba(239,159,39,0.5)',
                    borderRadius: 'var(--rads)', color: '#FAC775',
                    fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  <span>📍</span> Find nearest {chargerLabel} station
                </button>
              )}
            </div>
          )
        })()}

        {error && error !== 'no_compatible_bay' && (
          <div style={{ background: 'var(--rl)', border: '0.5px solid var(--rb)', borderRadius: 'var(--rads)', padding: '10px 14px', fontSize: 13, color: '#F7C1C1', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Confirm */}
        <button
          onClick={() => {
            const vehicle = vehicles.find((v) => v.id === selected)
            if (vehicle) onPick(vehicle)
          }}
          disabled={!selected || loading}
          style={{
            width: '100%', height: 56,
            background: selected ? 'var(--g)' : 'rgba(29,158,117,0.3)',
            color: '#fff', border: 'none', borderRadius: 14,
            fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800,
            cursor: selected ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.2s',
            boxShadow: selected ? '0 4px 20px rgba(29,158,117,0.35)' : 'none',
          }}
        >
          {loading
            ? <><span className="cq-spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff' }} /> Joining queue...</>
            : <>Join queue with this car ⚡</>
          }
        </button>
      </div>

      {/* Temp vehicle sheet */}
      {showTempSheet && (
        <TempVehicleSheet
          onConfirm={(tempVehicle) => {
            setShowTempSheet(false)
            onPick(tempVehicle)
          }}
          onClose={() => setShowTempSheet(false)}
        />
      )}
    </>
  )
}
