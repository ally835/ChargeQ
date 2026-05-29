import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/store/appStore'
import { getSuperAdminPin } from '@/hooks/useAdmin'

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

const linkBtnStyle: React.CSSProperties = {
  border: 'none', borderRadius: 6, padding: '4px 10px',
  fontSize: 11, fontFamily: '"DM Sans", sans-serif',
  cursor: 'pointer', fontWeight: 500, textDecoration: 'none',
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'rgba(29,158,117,0.1)', color: 'var(--mint)',
  border_unused: '0.5px solid rgba(29,158,117,0.25)',
} as React.CSSProperties

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

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

    toast(`${manager.name} approved ✓ — they can now log in with the assigned PIN.`)
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
          Set a temporary 4-digit PIN. The manager will be required to change it on first login.
        </div>

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
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', marginBottom: 6, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Confirm PIN</label>
          <input
            type="tel" inputMode="numeric" maxLength={4} placeholder="Repeat PIN"
            value={confirm} onChange={(e) => { setConfirm(e.target.value.replace(/\D/g,'').slice(0,4)); setError('') }}
            style={inputStyle}
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

export default function AdminApprovalsPage() {
  const setPendingManagerCount = useAppStore((s) => s.setPendingManagerCount)
  const toast = useToast()

  const [managers, setManagers] = useState<PendingManager[]>([])
  const [approving, setApproving] = useState<PendingManager | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadManagers() }, []) // eslint-disable-line

  async function loadManagers() {
    setLoading(true)
    const { data, error } = await supabase.rpc('sa_get_all_managers', { sa_pin: getSuperAdminPin() })
    setLoading(false)
    if (error) { toast('Could not load managers — SA session may have expired.'); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any
    if (result?.managers) {
      const list = result.managers as PendingManager[]
      setManagers(list)
      setPendingManagerCount(list.filter((m) => m.status === 'pending').length)
    }
  }

  async function handleSuspend(manager: PendingManager) {
    const { data } = await supabase.rpc('sa_suspend_manager', { sa_pin: getSuperAdminPin(), manager_id: manager.id })
    if (!data) { toast('Could not suspend. Check SA PIN.'); return }
    toast(`${manager.name} suspended.`)
    loadManagers()
  }

  async function handleReactivate(manager: PendingManager) {
    const newPin = prompt(`Set a new initial PIN (4 digits) for ${manager.name}:`)
    if (!newPin || !/^\d{4}$/.test(newPin)) { toast('Invalid PIN — must be 4 digits.'); return }
    const { data } = await supabase.rpc('sa_reactivate_manager', { sa_pin: getSuperAdminPin(), manager_id: manager.id, initial_pin: newPin })
    if (!data) { toast('Could not reactivate. Check SA PIN.'); return }
    toast(`${manager.name} reactivated ✓`)
    loadManagers()
  }

  async function handleResetPin(manager: PendingManager) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc('sa_reset_manager_pin', {
      sa_pin: getSuperAdminPin(),
      p_manager_id: manager.id,
    })
    if (!data) { toast('Could not reset PIN. Check SA PIN.'); return }
    toast(`PIN reset to 1234 for ${manager.name} — they must change it on next login.`)
    const body = encodeURIComponent(
      `Hi ${manager.name.split(' ')[0]},\n\nYour ChargeQ site manager PIN has been reset to 1234.\nLog in at https://chargeq.net and you will be prompted to set a new PIN immediately.\n\nChargeQ Team`
    )
    window.open(`mailto:${manager.email}?subject=${encodeURIComponent('ChargeQ PIN reset')}&body=${body}`)
  }

  function handleExportCSV() {
    const rows = [['Name', 'Email', 'Job Title', 'Company', 'Sites', 'Status', 'Registered']]
    managers.forEach((m) => rows.push([
      m.name, m.email, m.job_title ?? '', m.company ?? '',
      m.sites.join('; '), m.status,
      new Date(m.created_at).toLocaleDateString(),
    ]))
    downloadCSV(rows, 'chargeq_site_managers.csv')
  }

  const pending   = managers.filter((m) => m.status === 'pending')
  const approved  = managers.filter((m) => m.status === 'approved')
  const suspended = managers.filter((m) => m.status === 'suspended')

  const btnStyle: React.CSSProperties = {
    border: 'none', borderRadius: 6, padding: '4px 10px',
    fontSize: 11, fontFamily: '"DM Sans", sans-serif', cursor: 'pointer', fontWeight: 500,
  }

  return (
    <div style={{ padding: '14px 16px' }}>
      <AdminBadge icon="⬡" label="Super Admin — Manager Approvals" />

      {pending.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,159,39,0.18) 0%, rgba(239,159,39,0.08) 100%)',
          border: '1px solid var(--ab)', borderLeft: '4px solid var(--a)',
          borderRadius: 'var(--rads)', padding: '12px 14px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>⏳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--amber-t)', marginBottom: 2 }}>
              {pending.length} pending approval{pending.length > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(239,159,39,0.7)', lineHeight: 1.5 }}>
              {pending.map((m) => m.name).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Pending requests */}
      <div style={{ background: 'var(--surf)', border: `0.5px solid ${pending.length > 0 ? 'var(--ab)' : 'rgba(29,158,117,0.18)'}`, borderRadius: 'var(--rad)', padding: 14, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${pending.length > 0 ? 'var(--a)' : 'rgba(29,158,117,0.3)'}, transparent)` }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="section-label" style={{ margin: 0, color: pending.length > 0 ? 'var(--amber-t)' : undefined }}>
            {pending.length > 0 ? `⏳ ${pending.length} pending approval${pending.length > 1 ? 's' : ''}` : 'Pending approvals'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {managers.length > 0 && (
              <button onClick={handleExportCSV} style={{ ...btnStyle, background: 'var(--gc)', color: 'var(--teal)', border: '0.5px solid var(--gb)' }}>
                ↓ Export CSV
              </button>
            )}
            <button onClick={loadManagers} style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: 12, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}>
              {loading ? '...' : 'Refresh'}
            </button>
          </div>
        </div>

        {pending.length === 0 && !loading && (
          <p style={{ fontSize: 12, color: 'var(--mint)', textAlign: 'center', padding: 8 }}>No pending requests.</p>
        )}

        {pending.map((m) => (
          <div key={m.id} style={{ background: 'var(--al)', border: '0.5px solid var(--ab)', borderRadius: 'var(--rads)', padding: 12, marginBottom: 8 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--amber-t)', marginBottom: 3 }}>{m.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(239,159,39,0.8)', marginBottom: 2 }}>{m.email}</div>
            <div style={{ fontSize: 11, color: 'rgba(239,159,39,0.7)', marginBottom: 2 }}>{m.job_title} @ {m.company}</div>
            {m.abn && <div style={{ fontSize: 11, color: 'rgba(239,159,39,0.6)', marginBottom: 2 }}>ABN: {m.abn}</div>}
            {m.sites.length > 0 && <div style={{ fontSize: 11, color: 'rgba(239,159,39,0.6)', marginBottom: 10 }}>Sites: {m.sites.join(', ')}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setApproving(m)}
                style={{ flex: 1, minWidth: 120, height: 34, background: 'var(--g)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
              >
                ✓ Approve & set PIN
              </button>
              <button
                onClick={() => handleSuspend(m)}
                style={{ flex: 1, minWidth: 80, height: 34, background: 'transparent', color: '#F7C1C1', border: '0.5px solid var(--rb)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
              >
                ✗ Decline
              </button>
              <a
                href={`mailto:hello@chargeq.com.au?subject=${encodeURIComponent(`Verify manager: ${m.name}`)}&body=${encodeURIComponent(`Please verify the following manager request:\n\nName: ${m.name}\nEmail: ${m.email}\nJob title: ${m.job_title ?? '—'} @ ${m.company ?? '—'}\nABN: ${m.abn ?? '—'}\nSites: ${m.sites.join(', ')}\n\nRegistered: ${new Date(m.created_at).toLocaleString()}`)}`}
                style={{ height: 34, padding: '0 12px', background: 'rgba(239,159,39,0.1)', color: 'var(--amber-t)', border: '0.5px solid rgba(239,159,39,0.25)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                ✉ Verify with HQ
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Active managers */}
      {approved.length > 0 && (
        <div style={{ background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)', borderRadius: 'var(--rad)', padding: 14, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.3), transparent)' }} />
          <div className="section-label" style={{ marginBottom: 10 }}>Active site managers</div>
          {approved.map((m) => (
            <div key={m.id} style={{ padding: '10px 0', borderBottom: '0.5px solid rgba(29,158,117,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cream)' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--mint)' }}>{m.email} · {m.sites.slice(0,2).join(', ')}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleSuspend(m)}
                  style={{ ...btnStyle, background: 'transparent', color: '#F7C1C1', border: '0.5px solid var(--rb)' }}
                >
                  Suspend
                </button>
                <a
                  href={`mailto:${m.email}?subject=${encodeURIComponent('ChargeQ site manager access')}&body=${encodeURIComponent(`Hi ${m.name.split(' ')[0]},\n\nYour ChargeQ site manager account is active. Log in at https://chargeq.net and use the Site Manager login option.\n\nIf you have any questions, reply to this email.\n\nChargeQ Team`)}`}
                  style={{ ...btnStyle, background: 'rgba(29,158,117,0.1)', color: 'var(--mint)', border: '0.5px solid rgba(29,158,117,0.25)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  ✉ Resend link
                </a>
                <button
                  onClick={() => handleResetPin(m)}
                  style={{ ...btnStyle, background: 'rgba(239,159,39,0.1)', color: 'var(--amber-t)', border: '0.5px solid rgba(239,159,39,0.25)' }}
                >
                  🔑 Reset PIN
                </button>
              </div>
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
