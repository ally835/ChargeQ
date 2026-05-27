import { memo } from 'react'
import type { StationPoi } from '@/hooks/useOcm'
import { formatDistance, estimatedDriveMins, availabilityLabel } from '@/hooks/useOcm'

interface StationCardProps {
  station: StationPoi
  isSelected: boolean
  isJoined: boolean
  onClick: () => void
}

export const StationCard = memo(function StationCard({ station, isSelected, isJoined, onClick }: StationCardProps) {
  const avail = availabilityLabel(station)
  const driveMins = estimatedDriveMins(station.distanceKm)

  const availColors = {
    avail: { bg: 'var(--gl)', color: 'var(--teal)', border: 'var(--gb)', label: 'Likely available' },
    mod:   { bg: 'var(--al)', color: 'var(--amber-t)', border: 'var(--ab)', label: 'Moderate demand' },
    busy:  { bg: 'var(--rl)', color: '#F7C1C1', border: 'var(--rb)', label: 'Busy / offline' },
  }[avail]

  // Extract unique connector types
  const plugTypes = [...new Set(station.connections.map((c) => {
    const t = c.type
    if (t.includes('CCS')) return 'CCS2'
    if (t.includes('CHAdeMO')) return 'CHAdeMO'
    if (t.includes('Type 2') || t.includes('IEC')) return 'Type 2'
    if (t.includes('Tesla') || t.includes('NACS')) return 'Tesla'
    return t.split('(')[0].trim()
  }))].slice(0, 3)

  return (
    <div
      onClick={onClick}
      style={{
        background: isJoined ? 'var(--gl)' : isSelected ? 'var(--gl)' : 'var(--surf)',
        border: `${isSelected || isJoined ? '1px' : '0.5px'} solid ${isJoined ? 'var(--g)' : isSelected ? 'var(--g)' : 'rgba(29,158,117,0.18)'}`,
        borderRadius: 14,
        padding: '12px 14px',
        marginBottom: 10,
        cursor: 'pointer',
        transition: 'all 0.15s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
          {/* Icon */}
          <div style={{
            width: 38, height: 38, flexShrink: 0, borderRadius: 10,
            background: station.isChargeQ ? 'var(--gl)' : 'var(--bg3)',
            border: `0.5px solid ${station.isChargeQ ? 'var(--gb)' : 'rgba(29,158,117,0.18)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            {station.isChargeQ ? '⚡' : station.isFast ? '🔌' : '🔋'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cream)', lineHeight: 1.3, marginBottom: 2 }}>
              {station.name}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(240,239,232,0.55)', lineHeight: 1.4 }}>
              {station.addr}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0, marginLeft: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--mint)', fontWeight: 500 }}>
            {formatDistance(station.distanceKm)}
          </div>
          {station.direction && (
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--teal)',
              background: 'rgba(29,158,117,0.12)', border: '0.5px solid rgba(29,158,117,0.3)',
              borderRadius: 6, padding: '1px 6px', letterSpacing: '0.04em',
            }}>
              {station.direction}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0 4px' }}>
        {/* Availability */}
        <span style={{
          fontSize: 10.5, padding: '2.5px 7px', borderRadius: 8,
          fontWeight: 600, background: availColors.bg,
          color: availColors.color, border: `0.5px solid ${availColors.border}`,
          display: 'inline-flex', alignItems: 'center', gap: 3,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: availColors.color, display: 'inline-block',
          }} />
          {availColors.label}
        </span>

        {/* Fast charge */}
        {station.isFast && (
          <span style={{
            fontSize: 10.5, padding: '2.5px 7px', borderRadius: 8,
            fontWeight: 600, background: 'var(--bl)', color: '#85B7EB',
            border: '0.5px solid rgba(55,138,221,0.35)',
          }}>
            ⚡ Fast {station.maxKw > 0 ? `${station.maxKw}kW` : ''}
          </span>
        )}

        {/* ChargeQ badge */}
        {station.isChargeQ && (
          <span style={{
            fontSize: 10.5, padding: '2.5px 7px', borderRadius: 8,
            fontWeight: 600, background: 'var(--gl)', color: 'var(--g)',
            border: '0.5px solid var(--gb)',
          }}>
            ChargeQ ✓
          </span>
        )}

        {/* Joined */}
        {isJoined && (
          <span style={{
            fontSize: 10.5, padding: '2.5px 7px', borderRadius: 8,
            fontWeight: 600, background: 'var(--gl)', color: 'var(--teal)',
            border: '0.5px solid var(--gb)',
          }}>
            Queue joined ✓
          </span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <div style={{ fontSize: 11, color: 'rgba(240,239,232,0.65)', display: 'flex', alignItems: 'center', gap: 5 }}>
          {plugTypes.map((p) => (
            <span key={p} style={{ marginRight: 2 }}>{p}</span>
          ))}
          {plugTypes.length === 0 && <span>EV Charging</span>}
        </div>
        {driveMins > 0 && (
          <div style={{ fontSize: 11, color: 'var(--mint)' }}>
            🚗 ~{driveMins} min drive
          </div>
        )}
      </div>
    </div>
  )
})
