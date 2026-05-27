import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useQueueStore } from '@/store/queueStore'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { clearSuperAdminPin } from '@/hooks/useAdmin'

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '2.6.0'

function StatusRow({ ok, label, val }: { ok: boolean; label: string; val: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid rgba(29,158,117,0.1)', fontSize: 13 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? 'var(--g)' : 'var(--a)', flexShrink: 0 }} />
      <div style={{ flex: 1, color: 'var(--mint)' }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--cream)' }}>{val}</div>
    </div>
  )
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid rgba(29,158,117,0.1)', fontSize: 13 }}>
      <span style={{ color: 'var(--mint)' }}>{label}</span>
      <span style={{ fontWeight: 500, color: color ?? 'var(--cream)', fontSize: 12 }}>{value}</span>
    </div>
  )
}

export default function AdminSettingsPage() {
  const siteInfo = useAppStore((s) => s.siteInfo)
  const appMode = useAppStore((s) => s.appMode)
  const setAppMode = useAppStore((s) => s.setAppMode)
  const setPendingManagerCount = useAppStore((s) => s.setPendingManagerCount)
  const navigate = useNavigate()
  const isRealtimeConnected = useQueueStore((s) => s.isRealtimeConnected)
  const realtimeStatus = useQueueStore((s) => s.realtimeStatus)

  const isSuperAdmin = appMode === 'superadmin'

  function handleLockOut() {
    clearSuperAdminPin()
    setPendingManagerCount(0)
    setAppMode('user')
    navigate('/')
  }

  return (
    <div style={{ padding: '14px 16px' }}>
      <AdminBadge icon={isSuperAdmin ? '⬡' : '⚙️'} label={isSuperAdmin ? 'Super Admin — System Console' : 'Admin — Settings & System'} />

      {/* App version */}
      <div style={{ background: 'var(--gl)', border: '0.5px solid var(--gb)', borderRadius: 'var(--rads)', padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--mint)', marginBottom: 4 }}>App version</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--cream)' }}>v{APP_VERSION}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Built 2026 — ChargeQ Production</div>
      </div>

      {/* System status */}
      <div style={{ background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)', borderRadius: 'var(--rad)', padding: 14, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.3), transparent)' }} />
        <div className="section-label">System status</div>
        <StatusRow ok label="Supabase backend" val="Connected" />
        <StatusRow ok label="SMS (Twilio)" val="Live via Supabase Auth" />
        <StatusRow ok={isRealtimeConnected} label="Realtime (queue + bays)" val={
          isRealtimeConnected          ? 'Subscribed ✓'          :
          realtimeStatus === 'error'   ? 'Connection error'      :
          realtimeStatus === 'timeout' ? 'Timed out — retrying'  :
          'Connecting...'
        } />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 13 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--g)', flexShrink: 0 }} />
          <div style={{ flex: 1, color: 'var(--mint)' }}>Queue engine</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--cream)' }}>Server-authoritative RPC</div>
        </div>
      </div>

      {/* Site config */}
      <div style={{ background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)', borderRadius: 'var(--rad)', padding: 14, marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.3), transparent)' }} />
        <div className="section-label">Site configuration</div>
        <InfoRow label="Site" value={siteInfo.name} />
        <InfoRow label="Mode" value={isSuperAdmin ? 'Super Admin' : 'Site Manager'} color="var(--a)" />
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13 }}>
          <span style={{ color: 'var(--mint)' }}>Support</span>
          <a href="mailto:hello@chargeq.com.au" style={{ color: 'var(--g)', fontSize: 12, textDecoration: 'none' }}>hello@chargeq.com.au</a>
        </div>
      </div>

      <button
        onClick={handleLockOut}
        style={{
          width: '100%', height: 44,
          background: 'transparent', border: '0.5px solid var(--rb)',
          borderRadius: 'var(--rads)', color: '#F7C1C1',
          fontFamily: '"DM Sans", sans-serif', fontSize: 13, cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseOver={(e) => { (e.target as HTMLElement).style.background = 'var(--rl)' }}
        onMouseOut={(e) => { (e.target as HTMLElement).style.background = 'transparent' }}
      >
        🔒 Lock admin & return to user view
      </button>
      <div style={{ height: 8 }} />
    </div>
  )
}
