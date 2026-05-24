import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { useQueueStore } from '@/store/queueStore'
import { useAdminSetBayStatus } from '@/hooks/useAdmin'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { CHARGER_INFO } from '@/utils'
import type { Bay } from '@/types'

export default function AdminBaysPage() {
  const siteKey = useAppStore((s) => s.siteKey)
  const { bays, setBays } = useQueueStore()
  const { setBayStatus } = useAdminSetBayStatus()

  // Subscribe to realtime bay updates
  useEffect(() => {
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
      ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [siteKey]) // eslint-disable-line

  async function handleToggle(bay: Bay) {
    const newStatus = bay.status === 'occupied' ? 'free' : 'occupied'
    await setBayStatus(bay.num, newStatus, newStatus === 'occupied' ? 'STAFF' : undefined)
  }

  return (
    <div style={{ padding: '14px 16px' }}>
      <AdminBadge icon="⚡" label="Admin — Bay Control" />

      <div style={{ fontSize: 10, color: 'var(--teal)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
        Bay status & override
      </div>

      {bays.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--mint)', textAlign: 'center', padding: 16 }}>
          No bays configured for this site.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {bays.map((bay) => {
            const isOcc = bay.status === 'occupied'
            const isFault = bay.status === 'fault'
            const chargerInfo = CHARGER_INFO[bay.type] ?? { icon: '⚡', name: bay.type }
            return (
              <div
                key={bay.num}
                style={{
                  background: isOcc ? 'rgba(226,75,74,0.18)' : isFault ? 'var(--al)' : 'var(--gl)',
                  border: `2px solid ${isOcc ? 'var(--rb)' : isFault ? 'var(--ab)' : 'var(--gb)'}`,
                  borderRadius: 'var(--rads)', padding: '12px 10px',
                }}
              >
                <div style={{
                  fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800,
                  color: isOcc ? '#F7C1C1' : isFault ? 'var(--amber-t)' : 'var(--teal)',
                  marginBottom: 2,
                }}>
                  Bay {bay.num}
                </div>
                <div style={{ fontSize: 10, color: 'var(--mint)', marginBottom: 4 }}>
                  {chargerInfo.icon} {chargerInfo.name}
                </div>
                <div style={{ fontSize: 10, fontWeight: 500, color: isOcc ? '#F7C1C1' : 'var(--teal)', marginBottom: 8 }}>
                  {isOcc ? `Occupied${bay.plate ? ` — ${bay.plate}` : ''}` : isFault ? `Fault${bay.faultType ? `: ${bay.faultType}` : ''}` : 'Available'}
                </div>
                <button
                  onClick={() => handleToggle(bay)}
                  style={{
                    width: '100%', height: 28, borderRadius: 6, border: 'none',
                    background: isOcc ? 'var(--gl)' : 'var(--rl)',
                    color: isOcc ? 'var(--teal)' : '#F7C1C1',
                    border: `0.5px solid ${isOcc ? 'var(--gb)' : 'var(--rb)'}`,
                    fontSize: 10, fontWeight: 500, cursor: 'pointer',
                    fontFamily: '"DM Sans", sans-serif', transition: 'all 0.2s',
                  }}
                >
                  {isOcc ? 'Mark free' : 'Mark occupied'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, lineHeight: 1.5 }}>
        Override bay status when the system is unavailable or for maintenance. Changes reflect immediately in the driver queue view.
      </p>
    </div>
  )
}
