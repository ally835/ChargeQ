import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { useQueueStore } from '@/store/queueStore'
import { useAdminBayReady, useAdminRemoveFromQueue, useAdminNotifySMS, useAdminSimulateArrival } from '@/hooks/useAdmin'
import { useQueueRealtime } from '@/hooks/useQueue'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { CHARGER_INFO } from '@/utils'
import type { QueueEntry } from '@/types'

export default function AdminQueuePage() {
  const siteKey = useAppStore((s) => s.siteKey)
  const { adminQueue, bays } = useQueueStore()
  const { markBayReady } = useAdminBayReady()
  const { removeFromQueue } = useAdminRemoveFromQueue()
  const { notifyDriver } = useAdminNotifySMS()
  const { simulateArrival } = useAdminSimulateArrival()
  useQueueRealtime(siteKey)

  const occ = bays.filter((b) => b.status === 'occupied').length
  const free = bays.filter((b) => b.status === 'free').length

  const statCell = (n: number | string, label: string) => (
    <div key={label} style={{
      background: 'var(--gc)', border: '0.5px solid var(--gb)',
      borderRadius: 'var(--rads)', padding: '10px 8px', textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--g)', lineHeight: 1, marginBottom: 3 }}>{n}</div>
      <div style={{ fontSize: 10, color: 'var(--mint)' }}>{label}</div>
    </div>
  )

  return (
    <div style={{ padding: '14px 16px' }}>
      <AdminBadge icon="🔒" label="Admin — Queue Management" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {statCell(adminQueue.length, 'Queued')}
        {statCell(occ, 'Occupied')}
        {statCell(free, 'Available')}
      </div>

      <div style={{ fontSize: 10, color: 'var(--teal)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
        Live queue
      </div>

      {adminQueue.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--mint)', textAlign: 'center', padding: 16 }}>
          No drivers in queue
        </p>
      ) : (
        adminQueue.map((entry, i) => (
          <AdminQueueItem
            key={entry.id}
            entry={entry}
            rank={i + 1}
            isNext={i === 0}
            onBayReady={async () => { await markBayReady(entry.id, entry.name, entry.phone, entry.bayNum) }}
            onNotify={async () => { await notifyDriver(entry.name, entry.phone, entry.bayNum) }}
            onRemove={async () => { await removeFromQueue(entry.id, entry.name) }}
          />
        ))
      )}
      <button
        onClick={simulateArrival}
        style={{
          width: '100%', marginTop: 8, height: 38, borderRadius: 8,
          background: 'var(--bg3)', border: '0.5px dashed rgba(29,158,117,0.4)',
          color: 'var(--teal)', fontFamily: '"DM Sans", sans-serif',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        + Simulate new arrival
      </button>
    </div>
  )
}

function AdminQueueItem({
  entry, rank, isNext, onBayReady, onNotify, onRemove
}: {
  entry: QueueEntry
  rank: number
  isNext: boolean
  onBayReady: () => void
  onNotify: () => void
  onRemove: () => void
}) {
  const [loading, setLoading] = useState(false)

  const chargerInfo = CHARGER_INFO[entry.charger]

  return (
    <div style={{
      background: isNext ? 'var(--al)' : 'var(--bg3)',
      border: `0.5px solid ${isNext ? 'var(--ab)' : 'rgba(29,158,117,0.18)'}`,
      borderRadius: 'var(--rads)', padding: 12, marginBottom: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: isNext ? 'var(--al)' : 'var(--gl)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700,
          color: isNext ? 'var(--amber-t)' : 'var(--g)', flexShrink: 0,
        }}>{rank}</div>
        <div>
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--cream)' }}>{entry.plate}</div>
          <div style={{ fontSize: 11, color: 'var(--mint)' }}>{entry.name}</div>
        </div>
        {isNext && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--amber-t)', background: 'rgba(239,159,39,0.15)', borderRadius: 10, padding: '2px 8px', border: '0.5px solid var(--ab)' }}>
            Next up
          </span>
        )}
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        {[
          chargerInfo ? `${chargerInfo.icon} ${chargerInfo.name}` : entry.charger,
          `Bay ${entry.bayNum ?? '—'}`,
          `📱 ${entry.phone}`,
          entry.isRemote ? '🌐 Remote' : '📍 On-site',
        ].map((tag) => (
          <span key={tag} style={{
            background: 'var(--gc)', borderRadius: 4, padding: '2px 8px',
            fontSize: 10, color: 'var(--teal)', border: '0.5px solid rgba(29,158,117,0.2)',
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={async () => { setLoading(true); await onBayReady(); setLoading(false) }}
          disabled={loading}
          style={{
            flex: 1, height: 32, borderRadius: 6, border: 'none',
            background: 'var(--g)', color: '#fff',
            fontSize: 11, fontWeight: 500, cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif', transition: 'background 0.2s',
          }}
        >
          Bay ready ✓
        </button>
        <button
          onClick={onNotify}
          style={{
            flex: 1, height: 32, borderRadius: 6, border: '0.5px solid var(--ab)',
            background: 'var(--al)', color: 'var(--amber-t)',
            fontSize: 11, fontWeight: 500, cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          Notify 📱
        </button>
        <button
          onClick={onRemove}
          style={{
            flex: 1, height: 32, borderRadius: 6, border: '0.5px solid var(--rb)',
            background: 'var(--rl)', color: '#F7C1C1',
            fontSize: 11, fontWeight: 500, cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          Remove
        </button>
      </div>
    </div>
  )
}
