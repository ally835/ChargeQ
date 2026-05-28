import { useState } from 'react'
import type { StationPoi } from '@/hooks/useOcm'
import { formatDistance, estimatedDriveMins } from '@/hooks/useOcm'
import { useAuthStore } from '@/store/authStore'
import { useJoinQueue } from '@/hooks/useQueue'
import { useAppStore, useToast } from '@/store/appStore'
import { supabase } from '@/lib/supabase'
import type { ChargerType, PortSide } from '@/types'
import { FlagLocationModal } from './FlagLocationModal'

interface StationDetailPanelProps {
  station: StationPoi
  isJoined: boolean
  onJoined: () => void
  onClose: () => void
}

export function StationDetailPanel({ station, isJoined, onJoined, onClose }: StationDetailPanelProps) {
  const user = useAuthStore((s) => s.user)
  const siteInfo = useAppStore((s) => s.siteInfo)
  const toast = useToast()
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [showFlag, setShowFlag] = useState(false)
  const [flagDefaultReason, setFlagDefaultReason] = useState<string | undefined>(undefined)

  const driveMins = estimatedDriveMins(station.distanceKm)

  // Remote join — uses the RPC join_queue with the station as the site
  async function handleJoin() {
    if (!user) {
      toast('Sign in first to join a remote queue.')
      return
    }

    const vehicle = user.vehicles.find((v) => v.id === user.selectedVehicleId) ?? user.vehicles[0]
    if (!vehicle) {
      toast('Add a vehicle to your account first.')
      return
    }

    setJoinError(null)
    setJoining(true)

    const { data, error } = await supabase.rpc('join_queue', {
      p_site_id:   station.pid,
      p_site_name: station.name,
      p_name:      user.name,
      p_phone:     user.phone,
      p_plate:     vehicle.plate,
      p_charger:   vehicle.charger,
      p_port_side: vehicle.portSide ?? null,
      p_is_remote: true,
    })

    setJoining(false)

    const result = data as { error?: string; position?: number } | null
    if (error || !result || result.error) {
      if (result?.error === 'already_in_queue') {
        toast("You're already in the queue at this station.")
      } else if (result?.error === 'no_compatible_bay' && station.isChargeQ) {
        setJoinError('No compatible charger type available at this location right now.')
      } else {
        setJoinError(station.isChargeQ
          ? 'Could not join queue. Please try again.'
          : 'ChargeQ isn\'t active at this location yet. Be the first to request it!')
      }
      return
    }

    toast(`Queue position #${result.position} secured at ${station.name}! We'll SMS you when ready. ⚡`)
    onJoined()
  }

  // Detect charger type from connections
  const chargerTypes = [...new Set(station.connections.map((c) => {
    const t = c.type
    if (t.includes('CCS')) return 'CCS2'
    if (t.includes('CHAdeMO')) return 'CHAdeMO'
    if (t.includes('Type 2') || t.includes('IEC')) return 'Type 2'
    if (t.includes('Tesla') || t.includes('NACS')) return 'Tesla'
    return t.split('(')[0].trim()
  }))]

  const statCell = (n: string | number, label: string, color?: string) => (
    <div key={label} style={{
      background: 'var(--gc)', border: '0.5px solid var(--gb)',
      borderRadius: 8, padding: 8, textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: color ?? 'var(--cream)', lineHeight: 1, marginBottom: 2 }}>{n}</div>
      <div style={{ fontSize: 10, color: 'var(--mint)' }}>{label}</div>
    </div>
  )

  return (
    <>
      <div style={{
        background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.25)',
        borderRadius: 'var(--rad)', padding: 14, marginBottom: 10,
        animation: 'slideUp 0.25s ease',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--cream)', flex: 1, paddingRight: 8 }}>
            {station.name}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--mint)', cursor: 'pointer', padding: 0, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'rgba(240,239,232,0.55)', marginBottom: 10 }}>
          {station.addr}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 10 }}>
          {statCell(formatDistance(station.distanceKm), 'Distance', 'var(--g)')}
          {statCell(driveMins > 0 ? `~${driveMins}m` : '—', 'Drive time', 'var(--a)')}
        </div>

        {/* Connector badges */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {chargerTypes.map((ct) => (
            <span key={ct} style={{
              background: 'var(--gc)', border: '0.5px solid rgba(29,158,117,0.2)',
              borderRadius: 6, padding: '3px 8px', fontSize: 11, color: 'var(--teal)',
            }}>{ct}</span>
          ))}
          {station.isFast && (
            <span style={{
              background: 'var(--bl)', border: '0.5px solid rgba(55,138,221,0.35)',
              borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#85B7EB',
            }}>Fast {station.maxKw > 0 ? `${station.maxKw}kW` : 'DC'}</span>
          )}
        </div>

        {/* Info row */}
        <div style={{
          background: 'var(--gc)', borderRadius: 'var(--rads)',
          padding: '9px 11px', fontSize: 12, color: 'var(--mint)',
          lineHeight: 1.55, marginBottom: 10,
          borderLeft: '2px solid var(--g)',
        }}>
          Operated by <strong style={{ color: 'var(--cream)' }}>{station.operator}</strong>
          {station.plugCount > 0 && ` · ${station.plugCount} plug${station.plugCount !== 1 ? 's' : ''}`}
          {' · '}
          <span style={{ color: station.isOpen ? 'var(--teal)' : '#F7C1C1' }}>
            {station.statusText}
          </span>
        </div>

        {/* Join or joined state */}
        {isJoined ? (
          <div style={{
            background: 'var(--gl)', border: '0.5px solid var(--gb)',
            borderRadius: 'var(--rads)', padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: 'var(--teal)', marginBottom: 8,
          }}>
            <span>✓</span>
            <span>Queue position secured — we'll SMS when your bay is ready</span>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            style={{
              width: '100%', height: 44,
              background: joining ? 'var(--gm)' : 'var(--g)',
              color: '#fff', border: 'none',
              borderRadius: 'var(--rads)',
              fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s', marginBottom: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {joining
              ? <><span className="cq-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Joining...</>
              : '⚡ Join queue remotely'
            }
          </button>
        )}

        {/* Join error */}
        {joinError && (
          <div style={{
            background: 'var(--al)', border: '0.5px solid var(--ab)',
            borderRadius: 'var(--rads)', padding: '10px 12px',
            marginBottom: 8,
          }}>
            <div style={{ fontSize: 12, color: 'var(--amber-t)', lineHeight: 1.5, marginBottom: !station.isChargeQ ? 8 : 0 }}>
              {joinError}
            </div>
            {!station.isChargeQ && (
              <button
                onClick={() => { setJoinError(null); setFlagDefaultReason('no-chargeq'); setShowFlag(true) }}
                style={{
                  width: '100%', height: 36,
                  background: 'rgba(29,158,117,0.12)',
                  color: 'var(--teal)', border: '0.5px solid rgba(29,158,117,0.3)',
                  borderRadius: 'var(--rads)',
                  fontFamily: '"DM Sans", sans-serif', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                ⚡ Request ChargeQ at this location
              </button>
            )}
          </div>
        )}

        {/* Navigation */}
        <button
          onClick={() => {
            const url = `https://maps.apple.com/?daddr=${station.lat},${station.lng}&dirflg=d`
            window.open(url, '_blank')
          }}
          style={{
            width: '100%', height: 38,
            background: 'transparent', color: 'var(--mint)',
            border: '0.5px solid rgba(29,158,117,0.35)',
            borderRadius: 'var(--rads)',
            fontFamily: '"DM Sans", sans-serif', fontSize: 12,
            cursor: 'pointer', marginBottom: 8, transition: 'background 0.2s',
          }}
          onMouseOver={(e) => { (e.target as HTMLElement).style.background = 'var(--gl)' }}
          onMouseOut={(e) => { (e.target as HTMLElement).style.background = 'transparent' }}
        >
          🗺 Get directions
        </button>

        {/* Flag */}
        <button
          onClick={() => setShowFlag(true)}
          style={{
            width: '100%', height: 38,
            background: 'transparent', border: '0.5px solid rgba(226,75,74,0.25)',
            borderRadius: 'var(--rads)', color: 'rgba(247,193,193,0.65)',
            fontFamily: '"DM Sans", sans-serif', fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            const el = e.currentTarget
            el.style.background = 'var(--rl)'
            el.style.borderColor = 'var(--rb)'
            el.style.color = '#F7C1C1'
          }}
          onMouseOut={(e) => {
            const el = e.currentTarget
            el.style.background = 'transparent'
            el.style.borderColor = 'rgba(226,75,74,0.25)'
            el.style.color = 'rgba(247,193,193,0.65)'
          }}
        >
          🚩 Report / Flag location
        </button>
      </div>

      {showFlag && (
        <FlagLocationModal
          stationName={station.name}
          lat={station.lat}
          lng={station.lng}
          defaultReason={flagDefaultReason}
          onClose={() => { setShowFlag(false); setFlagDefaultReason(undefined) }}
        />
      )}
    </>
  )
}
