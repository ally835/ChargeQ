import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useQueueStore } from '@/store/queueStore'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/store/appStore'
import { getSuperAdminPin, clearSuperAdminPin } from '@/hooks/useAdmin'

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '2.6.0'

interface PendingManager {
  id: string
  name: string
  email: string
  mobile: string | null
  job_title: string | null
  company: string | null
  abn: string | null
  sites: string[]
  status: string
  created_at: string
}

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

// Modal for approving a manager — SA sets their initial PIN
function ApproveManagerModal({
  manager, onClose, onApproved,
}: {
  manager: PendingManager
  onClose: () => void
  onApproved: () => void
}) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 46, padding: '0 14px',
    background: 'var(--bg3)', border: '0.5px solid rgba(29,158,117,0.25)',
    borderRadius: 'var(--rads)', color: 'var(--cream)',
    fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700,
    textAlign: 'center', letterSpacing: '0.15em',
    outline: 'none',
  }

  async function handleApprove() {
    if (!/^\d{4}$/.test(pin)) { setError('PIN must be exactly 4 digits'); return }
    if (pin !== confirm) { setError('PINs do not match'); return }
    setError('')
    setLoading(true)

    const { data, error: rpcErr } = await supabase.rpc('sa_approve_manager', {
      sa_pin:      getSuperAdminPin(),
      manager_id:  manager.id,
      initial_pin: pin,
    })

    setLoading(false)

    if (rpcErr || !data) {
      toast('Could not approve manager. Check your SA PIN and try again.')
      return
    }

    toast(`${manager.name} approved ✓ — they'll receive an email with login instructions.`)
    onApproved()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg2)', border: '0.5px solid rgba(29,158,117,0.3)', borderTop: '2px solid var(--g)', borderRadius: '20px 20px 0 0', padding: 'max(20px,20px) 20px max(24px,env(safe-area-inset-bottom,24px))', width: '100%', maxWidth: 480, animation: 'slideSheet 0.3s cubic-bezier(.2,.8,.3,1)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--g)', marginBottom: 4 }}>
          ✅ Approve {manager.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 16 }}>
          Set a temporary 4-digit PIN for this manager. They will be required to change it on first login.
        </div>

        {/* Manager summary */}
        <div style={{ background: 'var(--bg3)', borderRadius: 'var(--rads)', padding: 12, marginBottom: 16, fontSize: 12, color: 'var(--mint)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--cream)', display: 'block', marginBottom: 2 }}>{manager.name}</strong>
          {manager.email}<br />
          {manager.job_title} @ {manager.company}<br />
          Sites: {manager.sites.join(', ')}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', marginBottom: 6, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Initial PIN</label>
          <input
            type="tel" inputMode="numeric" maxLength={4} placeholder="4 digits"
            value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g,'').slice(0,4)); setError('') }}
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.1)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(29,158,117,0.25)'; e.target.style.boxShadow = '' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', marginBottom: 6, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Confirm PIN</label>
          <input
            type="tel" inputMode="numeric" maxLength={4} placeholder="Repeat PIN"
            value={confirm} onChange={(e) => { setConfirm(e.target.value.replace(/\D/g,'').slice(0,4)); setError('') }}
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.1)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(29,158,117,0.25)'; e.target.style.boxShadow = '' }}
          />
        </div>

        {error && <div style={{ fontSize: 12, color: '#F7C1C1', marginBottom: 12, textAlign: 'center' }}>{error}</div>}

        <button
          onClick={handleApprove}
          disabled={loading || pin.length < 4}
          style={{
            width: '100%', height: 48, background: pin.length === 4 ? 'var(--g)' : 'rgba(29,158,117,0.3)',
            color: '#fff', border: 'none', borderRadius: 'var(--rads)',
            fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
            cursor: pin.length === 4 ? 'pointer' : 'not-allowed', marginBottom: 8,
          }}
        >
          {loading ? 'Approving...' : 'Approve & set PIN ✓'}
        </button>
        <button onClick={onClose} style={{ width: '100%', height: 40, background: 'transparent', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: 'var(--rads)', color: 'var(--mint)', fontSize: 13, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  const siteInfo = useAppStore((s) => s.siteInfo)
  const appMode = useAppStore((s) => s.appMode)
  const setAppMode = useAppStore((s) => s.setAppMode)
  const navigate = useNavigate()
  const isRealtimeConnected = useQueueStore((s) => s.isRealtimeConnected)
  const toast = useToast()

  const [managers, setManagers] = useState<PendingManager[]>([])
  const [approving, setApproving] = useState<PendingManager | null>(null)
  const [loadingManagers, setLoadingManagers] = useState(false)

  const isSuperAdmin = appMode === 'superadmin'

  // Load managers when in super admin mode
  useEffect(() => {
    if (!isSuperAdmin) return
    loadManagers()
  }, [isSuperAdmin]) // eslint-disable-line

  async function loadManagers() {
    setLoadingManagers(true)
    const { data, error } = await supabase.rpc('sa_get_all_managers', {
      sa_pin: getSuperAdminPin(),
    })
    setLoadingManagers(false)
    if (error) { toast('Could not load managers — SA session may have expired.'); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any
    if (result?.managers) setManagers(result.managers as PendingManager[])
  }

  async function handleSuspend(manager: PendingManager) {
    const { data } = await supabase.rpc('sa_suspend_manager', {
      sa_pin:     getSuperAdminPin(),
      manager_id: manager.id,
    })
    if (!data) { toast('Could not suspend. Check SA PIN.'); return }
    toast(`${manager.name} suspended.`)
    loadManagers()
  }

  async function handleReactivate(manager: PendingManager) {
    const newPin = prompt(`Set a new initial PIN (4 digits) for ${manager.name}:`)
    if (!newPin || !/^\d{4}$/.test(newPin)) { toast('Invalid PIN — must be 4 digits.'); return }
    const { data } = await supabase.rpc('sa_reactivate_manager', {
      sa_pin:      getSuperAdminPin(),
      manager_id:  manager.id,
      initial_pin: newPin,
    })
    if (!data) { toast('Could not reactivate. Check SA PIN.'); return }
    toast(`${manager.name} reactivated ✓ — they can log in with the new PIN.`)
    loadManagers()
  }

  function handleLockOut() {
    clearSuperAdminPin()
    setAppMode('user')
    navigate('/')
  }

  const pending   = managers.filter((m) => m.status === 'pending')
  const approved  = managers.filter((m) => m.status === 'approved')
  const suspended = managers.filter((m) => m.status === 'suspended')

  return (
    <div style={{ padding: '14px 16px' }}>
      <AdminBadge icon={isSuperAdmin ? '⬡' : '⚙️'} label={isSuperAdmin ? 'Super Admin — System Console' : 'Admin — Settings & System'} />

      {/* ── SUPER ADMIN: Pending approvals ── */}
      {isSuperAdmin && (
        <>
          {/* Pending requests */}
          <div style={{ background: 'var(--surf)', border: `0.5px solid ${pending.length > 0 ? 'var(--ab)' : 'rgba(29,158,117,0.18)'}`, borderRadius: 'var(--rad)', padding: 14, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${pending.length > 0 ? 'var(--a)' : 'rgba(29,158,117,0.3)'}, transparent)` }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="section-label" style={{ margin: 0, color: pending.length > 0 ? 'var(--amber-t)' : undefined }}>
                {pending.length > 0 ? `⏳ ${pending.length} pending approval${pending.length > 1 ? 's' : ''}` : 'Pending approvals'}
              </div>
              <button onClick={loadManagers} style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: 12, cursor: 'pointer' }}>
                {loadingManagers ? '...' : 'Refresh'}
              </button>
            </div>

            {pending.length === 0 && !loadingManagers && (
              <p style={{ fontSize: 12, color: 'var(--mint)', textAlign: 'center', padding: 8 }}>No pending requests.</p>
            )}

            {pending.map((m) => (
              <div key={m.id} style={{ background: 'var(--al)', border: '0.5px solid var(--ab)', borderRadius: 'var(--rads)', padding: 12, marginBottom: 8 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--amber-t)', marginBottom: 3 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(239,159,39,0.8)', marginBottom: 2 }}>{m.email}</div>
                <div style={{ fontSize: 11, color: 'rgba(239,159,39,0.7)', marginBottom: 2 }}>{m.job_title} @ {m.company}</div>
                {m.sites.length > 0 && <div style={{ fontSize: 11, color: 'rgba(239,159,39,0.6)', marginBottom: 10 }}>Sites: {m.sites.join(', ')}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { setApproving(m) }}
                    style={{
                      flex: 1, height: 34, background: 'var(--g)', color: '#fff', border: 'none',
                      borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      fontFamily: '"DM Sans", sans-serif',
                    }}
                  >
                    ✓ Approve & set PIN
                  </button>
                  <button
                    onClick={() => handleSuspend(m)}
                    style={{
                      flex: 1, height: 34, background: 'transparent', color: '#F7C1C1',
                      border: '0.5px solid var(--rb)', borderRadius: 8,
                      fontSize: 12, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
                    }}
                  >
                    ✗ Decline
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Approved managers */}
          {approved.length > 0 && (
            <div style={{ background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)', borderRadius: 'var(--rad)', padding: 14, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.3), transparent)' }} />
              <div className="section-label" style={{ marginBottom: 10 }}>Active site managers</div>
              {approved.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid rgba(29,158,117,0.1)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cream)' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--mint)' }}>{m.email} · {m.sites.slice(0,2).join(', ')}</div>
                  </div>
                  <button
                    onClick={() => handleSuspend(m)}
                    style={{ background: 'transparent', border: '0.5px solid var(--rb)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#F7C1C1', cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
                  >
                    Suspend
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Suspended managers */}
          {suspended.length > 0 && (
            <div style={{ background: 'var(--surf)', border: '0.5px solid var(--rb)', borderRadius: 'var(--rad)', padding: 14, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(247,193,193,0.3), transparent)' }} />
              <div className="section-label" style={{ marginBottom: 10, color: '#F7C1C1' }}>Suspended managers</div>
              {suspended.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid rgba(247,193,193,0.1)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cream)' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--mint)' }}>{m.email}</div>
                  </div>
                  <button
                    onClick={() => handleReactivate(m)}
                    style={{ background: 'var(--g)', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#fff', cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
                  >
                    Reactivate
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

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
        <StatusRow ok={isRealtimeConnected} label="Realtime (queue + bays)" val={isRealtimeConnected ? 'Subscribed ✓' : 'Connecting...'} />
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

      {/* Approve manager modal */}
      {approving && (
        <ApproveManagerModal
          manager={approving}
          onClose={() => setApproving(null)}
          onApproved={() => { setApproving(null); loadManagers() }}
        />
      )}
    </div>
  )
}
