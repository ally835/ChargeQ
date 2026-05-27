import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { useQueueStore } from '@/store/queueStore'
import { useAdminSetBayStatus } from '@/hooks/useAdmin'
import { useQueueRealtime } from '@/hooks/useQueue'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { CHARGER_INFO } from '@/utils'
import type { Bay, QueueEntry } from '@/types'

export default function AdminBaysPage() {
  const siteKey = useAppStore((s) => s.siteKey)
  const { bays, setBays, adminQueue } = useQueueStore()
  const { setBayStatus } = useAdminSetBayStatus()

  // Keep queue live while on this tab
  useQueueRealtime(siteKey)

  const [leftToday, setLeftToday] = useState<number | null>(null)
  // Active non-waiting entries (ready + charging) — for bay card driver lookup.
  // adminQueue only holds 'waiting'; these fill the gaps for assigned/charging drivers.
  const [activeEntries, setActiveEntries] = useState<QueueEntry[]>([])

  const fetchActiveEntries = async () => {
    const { data } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('site_id', siteKey)
      .in('status', ['ready', 'charging'])
    if (data) {
      setActiveEntries(data.map((e) => ({
        id: e.id, siteId: e.site_id, siteName: e.site_name,
        userId: e.user_id ?? '', name: e.name, phone: e.phone,
        plate: e.plate, charger: e.charger as QueueEntry['charger'],
        portSide: (e.port_side ?? 'rr') as QueueEntry['portSide'],
        bayNum: e.bay_num, position: e.position,
        estimatedWaitMins: e.estimated_wait_mins,
        status: e.status as QueueEntry['status'],
        isRemote: e.is_remote, joinedAt: e.joined_at,
      })))
    }
  }

  // Bays + active-entries realtime
  useEffect(() => {
    fetchActiveEntries()
    const channel = supabase
      .channel(`admin-bays-${siteKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bays', filter: `site_id=eq.${siteKey}` },
        async () => {
          const { data } = await supabase.from('bays').select('*').eq('site_id', siteKey).order('num')
          if (data) setBays(data.map((b) => ({
            num: b.num, type: b.type as Bay['type'],
            status: b.status as Bay['status'], plate: b.plate,
            faultType: b.fault_type ?? undefined,
          })))
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries', filter: `site_id=eq.${siteKey}` },
        () => fetchActiveEntries()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [siteKey]) // eslint-disable-line

  // Fetch today's left count
  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    supabase
      .from('queue_entries')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteKey)
      .in('status', ['left', 'cancelled'])
      .gte('updated_at', today.toISOString())
      .then(({ count }) => setLeftToday(count ?? 0))
  }, [siteKey])

  // Full active set for bay card driver lookups
  const allActiveEntries = [...adminQueue, ...activeEntries]

  const waiting = adminQueue.length
  const free    = bays.filter((b) => b.status === 'free').length

  return (
    <div style={{ padding: '14px 16px' }}>
      <AdminBadge icon="⚡" label="Admin — Bay Control" />

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { n: waiting,                        label: 'In queue',       color: 'var(--g)' },
          { n: free,                           label: 'Bays free',      color: 'var(--teal)' },
          { n: leftToday ?? '—',               label: 'Left today',     color: 'var(--text3)' },
        ].map(({ n, label, color }) => (
          <div key={label} style={{ background: 'var(--gc)', border: '0.5px solid var(--gb)', borderRadius: 'var(--rads)', padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color, lineHeight: 1, marginBottom: 3 }}>{n}</div>
            <div style={{ fontSize: 10, color: 'var(--mint)' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: 'var(--teal)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
        Bay status & override
      </div>

      {bays.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--mint)', textAlign: 'center', padding: 16 }}>
          No bays configured for this site.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bays.map((bay) => (
            <BayControl
              key={bay.num}
              bay={bay}
              queue={allActiveEntries}
              onSet={setBayStatus}
            />
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, lineHeight: 1.5 }}>
        Override bay status when the system is unavailable or for maintenance. Changes reflect immediately in the driver queue view.
      </p>
    </div>
  )
}

function BayControl({ bay, queue, onSet }: {
  bay: Bay
  queue: QueueEntry[]
  onSet: (num: number, status: 'free' | 'occupied' | 'fault', plate?: string) => Promise<boolean>
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [plateInput, setPlateInput] = useState('')
  const [showPlate, setShowPlate] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const isOcc   = bay.status === 'occupied'
  const isFault = bay.status === 'fault'
  const isFree  = bay.status === 'free'
  const chargerInfo = CHARGER_INFO[bay.type] ?? { icon: '⚡', name: bay.type }

  // Driver assigned to this specific bay
  const assigned = queue.find((e) => e.bayNum === bay.num)

  // All drivers waiting for this charger type (no bay yet)
  const waitingForType = queue.filter((e) => e.charger === bay.type && e.bayNum == null)
  const nextEligible = !assigned && isFree ? waitingForType[0] ?? null : null

  async function set(status: 'free' | 'occupied' | 'fault', plate?: string) {
    setLoading(status)
    await onSet(bay.num, status, plate)
    setLoading(null)
    setShowPlate(false)
    setPlateInput('')
  }

  return (
    <div style={{
      background: isOcc ? 'rgba(226,75,74,0.1)' : isFault ? 'rgba(239,159,39,0.1)' : 'var(--gc)',
      border: `1.5px solid ${isOcc ? 'var(--rb)' : isFault ? 'var(--ab)' : 'var(--gb)'}`,
      borderRadius: 'var(--rads)',
    }}>
      {/* Header row — always visible, tappable to expand */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: isOcc ? 'var(--rl)' : isFault ? 'var(--al)' : 'var(--gl)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800,
          color: isOcc ? '#F7C1C1' : isFault ? 'var(--amber-t)' : 'var(--teal)',
        }}>
          {bay.num}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', marginBottom: 1 }}>Bay {bay.num}</div>
          <div style={{ fontSize: 10, color: 'var(--mint)' }}>{chargerInfo.icon} {chargerInfo.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {waitingForType.length > 0 && (
            <div style={{
              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
              background: 'rgba(29,158,117,0.12)', color: 'var(--teal)',
              border: '0.5px solid rgba(29,158,117,0.25)',
            }}>
              {waitingForType.length} waiting
            </div>
          )}
          <div style={{
            fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
            background: isOcc ? 'var(--rl)' : isFault ? 'var(--al)' : 'var(--gl)',
            color: isOcc ? '#F7C1C1' : isFault ? 'var(--amber-t)' : 'var(--teal)',
            border: `0.5px solid ${isOcc ? 'var(--rb)' : isFault ? 'var(--ab)' : 'var(--gb)'}`,
          }}>
            {isOcc ? `Occupied${bay.plate ? ` · ${bay.plate}` : ''}` : isFault ? `Maintenance${bay.faultType ? ` · ${bay.faultType}` : ''}` : 'Free'}
          </div>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 14px 12px' }}>

          {/* Assigned / next eligible driver */}
          {(assigned || nextEligible) && (
            <div style={{
              background: assigned?.status === 'charging'
                ? 'rgba(29,158,117,0.18)'
                : assigned?.status === 'ready'
                ? 'rgba(29,158,117,0.12)'
                : 'rgba(29,158,117,0.06)',
              border: `0.5px solid ${assigned ? 'var(--gb)' : 'rgba(29,158,117,0.2)'}`,
              borderRadius: 6, padding: '8px 10px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: assigned?.status === 'charging'
                  ? 'var(--g)'
                  : assigned?.status === 'ready'
                  ? 'var(--g)'
                  : 'rgba(93,202,165,0.5)',
                boxShadow: assigned?.status === 'charging' ? '0 0 6px var(--g)' : 'none',
              }} />
              <div style={{ flex: 1 }}>
                {assigned ? (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cream)' }}>
                      {assigned.name}
                      <span style={{
                        marginLeft: 6, fontSize: 9, fontWeight: 500,
                        color: assigned.status === 'charging' ? 'var(--g)' : assigned.status === 'ready' ? 'var(--g)' : 'var(--teal)',
                        background: assigned.status === 'charging' ? 'var(--gl)' : assigned.status === 'ready' ? 'var(--gl)' : 'rgba(29,158,117,0.1)',
                        borderRadius: 8, padding: '1px 6px',
                        border: `0.5px solid ${assigned.status !== 'waiting' ? 'var(--gb)' : 'transparent'}`,
                      }}>
                        {assigned.status === 'charging' ? '⚡ Charging' : 'Notified — en route'}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--mint)', marginTop: 1 }}>{assigned.plate}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cream)' }}>
                      {nextEligible!.name}
                      <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--text3)', fontWeight: 400 }}>next eligible</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--mint)', marginTop: 1 }}>{nextEligible!.plate} · pos #{nextEligible!.position}</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Full waiting queue for this charger type */}
          {waitingForType.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--teal)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Waiting for {chargerInfo.name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {waitingForType.map((e, i) => (
                  <div key={e.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--bg3)', border: '0.5px solid rgba(29,158,117,0.12)',
                    borderRadius: 6, padding: '7px 10px', fontSize: 12,
                  }}>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13, color: 'var(--g)', width: 16 }}>{i + 1}</span>
                    <span style={{ fontWeight: 500, color: 'var(--cream)', flex: 1 }}>{e.plate}</span>
                    <span style={{ fontSize: 11, color: 'var(--mint)' }}>{e.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>~{(i + 1) * 4}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isFree && !assigned && waitingForType.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, paddingLeft: 2 }}>
              No drivers waiting for this charger type
            </div>
          )}

          {/* Plate input */}
          {showPlate && (
            <div style={{ marginBottom: 8, display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="Plate (optional)"
                value={plateInput}
                onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                autoFocus
                style={{
                  flex: 1, height: 36, padding: '0 10px',
                  background: 'var(--bg3)', border: '1px solid rgba(29,158,117,0.3)',
                  borderRadius: 8, color: 'var(--cream)',
                  fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
                  letterSpacing: '0.08em', outline: 'none', textTransform: 'uppercase',
                }}
              />
              <button
                onClick={() => set('occupied', plateInput || undefined)}
                disabled={!!loading}
                style={{ height: 36, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--r)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
              >
                {loading === 'occupied' ? '…' : 'Confirm'}
              </button>
              <button
                onClick={() => { setShowPlate(false); setPlateInput('') }}
                style={{ height: 36, padding: '0 10px', borderRadius: 8, border: '0.5px solid rgba(29,158,117,0.2)', background: 'transparent', color: 'var(--text3)', fontSize: 11, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <button
              disabled={isOcc || !!loading}
              onClick={(e) => { e.stopPropagation(); setShowPlate(true) }}
              style={{
                height: 32, borderRadius: 6,
                background: isOcc ? 'rgba(226,75,74,0.08)' : 'var(--rl)',
                color: isOcc ? 'rgba(247,193,193,0.35)' : '#F7C1C1',
                border: `0.5px solid ${isOcc ? 'rgba(226,75,74,0.15)' : 'var(--rb)'}`,
                fontSize: 11, fontWeight: 500, cursor: isOcc ? 'default' : 'pointer',
                fontFamily: '"DM Sans", sans-serif',
              }}
            >
              Bay Taken
            </button>
            <button
              disabled={isFree || !!loading}
              onClick={(e) => { e.stopPropagation(); set('free') }}
              style={{
                height: 32, borderRadius: 6,
                background: isFree ? 'rgba(29,158,117,0.08)' : 'var(--gl)',
                color: isFree ? 'rgba(93,202,165,0.35)' : 'var(--teal)',
                border: `0.5px solid ${isFree ? 'rgba(29,158,117,0.15)' : 'var(--gb)'}`,
                fontSize: 11, fontWeight: 500, cursor: isFree ? 'default' : 'pointer',
                fontFamily: '"DM Sans", sans-serif',
              }}
            >
              {loading === 'free' ? '…' : 'Bay Free'}
            </button>
            <button
              disabled={isFault || !!loading}
              onClick={(e) => { e.stopPropagation(); set('fault') }}
              style={{
                height: 32, borderRadius: 6,
                background: isFault ? 'rgba(239,159,39,0.08)' : 'var(--al)',
                color: isFault ? 'rgba(239,159,39,0.35)' : 'var(--amber-t)',
                border: `0.5px solid ${isFault ? 'rgba(239,159,39,0.15)' : 'var(--ab)'}`,
                fontSize: 11, fontWeight: 500, cursor: isFault ? 'default' : 'pointer',
                fontFamily: '"DM Sans", sans-serif',
              }}
            >
              {loading === 'fault' ? '…' : 'Maintenance'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
