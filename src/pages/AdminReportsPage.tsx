import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { useQueueStore } from '@/store/queueStore'
import { AdminBadge } from '@/components/admin/AdminBadge'

interface FaultReport { id: string; bay_num: number|null; fault_type: string; description: string|null; reported_at: string; resolved: boolean }
interface BayTakenIncident { id: string; assigned_bay: number; offender_plate: string|null; fault_type?: string|null; notes: string|null; reported_at: string }
interface LocationFlag { id: string; station_name: string; reason: string; notes: string|null; reported_at: string; actioned: boolean }

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid rgba(29,158,117,0.1)', fontSize: 13 }}>
      <span style={{ color: 'var(--mint)' }}>{label}</span>
      <span style={{ fontWeight: 500, color: 'var(--cream)', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const btnBase: React.CSSProperties = {
  border: 'none', borderRadius: 6, padding: '4px 10px',
  fontSize: 11, fontFamily: '"DM Sans", sans-serif',
  cursor: 'pointer', fontWeight: 500, transition: 'opacity 0.15s',
}

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

export default function AdminReportsPage() {
  const siteKey = useAppStore((s) => s.siteKey)
  const siteInfo = useAppStore((s) => s.siteInfo)
  const appMode = useAppStore((s) => s.appMode)
  const isSuperAdmin = appMode === 'superadmin'
  const adminQueue = useQueueStore((s) => s.adminQueue)
  const [faults, setFaults] = useState<FaultReport[]>([])
  const [bayTaken, setBayTaken] = useState<BayTakenIncident[]>([])
  const [flags, setFlags] = useState<LocationFlag[]>([])
  const [flagsError, setFlagsError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showActioned, setShowActioned] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [resolvingFault, setResolvingFault] = useState<string | null>(null)

  async function fetchAll() {
    setRefreshing(true)
    setFlagsError(null)

    async function fetchFlags() {
      const r = await supabase.from('location_flags').select('*').order('reported_at', { ascending: false }).limit(100)
      if (r.error) setFlagsError(r.error.message)
      else if (r.data) setFlags(r.data as LocationFlag[])
    }

    async function fetchFaults() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).rpc('get_fault_reports', { p_site_id: siteKey })
      if (data) setFaults(data)
    }

    async function fetchBayTaken() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).rpc('get_bay_taken_incidents', { p_site_id: siteKey })
      if (data) setBayTaken(data)
    }

    const jobs: Promise<void>[] = [fetchFlags()]
    if (!isSuperAdmin) {
      jobs.push(fetchFaults(), fetchBayTaken())
    }
    await Promise.all(jobs)
    setRefreshing(false)
  }

  useEffect(() => { fetchAll() }, [siteKey, isSuperAdmin]) // eslint-disable-line

  async function handleResolveFault(id: string) {
    setResolvingFault(id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc('resolve_fault_report', { p_fault_id: id })
    if (data) setFaults((prev) => prev.map((f) => f.id === id ? { ...f, resolved: true } : f))
    setResolvingFault(null)
  }

  async function handleMarkActioned(id: string) {
    setActioning(id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc('mark_flag_actioned', { p_flag_id: id })
    if (data) setFlags((prev) => prev.map((f) => f.id === id ? { ...f, actioned: true } : f))
    setActioning(null)
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete flag for "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc('delete_location_flag', { p_flag_id: id })
    if (data) setFlags((prev) => prev.filter((f) => f.id !== id))
    setDeleting(null)
  }

  function exportFaultsCSV() {
    const rows: string[][] = [['Bay', 'Fault Type', 'Description', 'Reported', 'Resolved']]
    faults.forEach((f) => rows.push([
      f.bay_num != null ? String(f.bay_num) : '—',
      f.fault_type,
      f.description ?? '',
      new Date(f.reported_at).toLocaleString(),
      f.resolved ? 'Yes' : 'No',
    ]))
    downloadCSV(rows, `${siteInfo.name.replace(/\s+/g,'_')}_fault_reports.csv`)
  }

  function exportBayTakenCSV() {
    const rows: string[][] = [['Bay', 'Offender Plate', 'Notes', 'Reported']]
    bayTaken.forEach((bt) => rows.push([
      String(bt.assigned_bay),
      bt.offender_plate ?? '',
      bt.notes ?? '',
      new Date(bt.reported_at).toLocaleString(),
    ]))
    downloadCSV(rows, `${siteInfo.name.replace(/\s+/g,'_')}_bay_taken_incidents.csv`)
  }

  const openFlags = flags.filter((f) => !f.actioned)
  const actionedFlags = flags.filter((f) => f.actioned)

  const chargerCounts: Record<string, number> = {}
  adminQueue.forEach((e) => { chargerCounts[e.charger] = (chargerCounts[e.charger] || 0) + 1 })
  const topCharger = Object.entries(chargerCounts).sort(([,a],[,b]) => b-a)[0]?.[0] ?? '—'
  const avgWait = adminQueue.length ? `~${adminQueue.length * 4} min avg` : '—'

  return (
    <div style={{ padding: '14px 16px' }}>
      <AdminBadge icon="🚩" label={isSuperAdmin ? 'Super Admin — Reports' : 'Admin — Reports & Flags'} />

      {/* Session summary — SM only */}
      {!isSuperAdmin && (
        <div style={{ background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)', borderRadius: 'var(--rad)', padding: 14, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.3), transparent)' }} />
          <div className="section-label">Session summary</div>
          <InfoRow label="Drivers in queue" value={String(adminQueue.length)} />
          <InfoRow label="Avg. wait time" value={avgWait} />
          <InfoRow label="Most popular charger" value={topCharger} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13 }}>
            <span style={{ color: 'var(--mint)' }}>Peak hour</span>
            <span style={{ fontWeight: 500, color: 'var(--cream)' }}>—</span>
          </div>
        </div>
      )}

      {/* Fault reports — SM only */}
      {!isSuperAdmin && (
        <div style={{ background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)', borderRadius: 'var(--rad)', padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--amber-t)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>⚠️ Bay fault reports</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'rgba(239,159,39,0.6)' }}>{faults.length > 0 ? `${faults.length} reported` : 'None reported'}</span>
              {faults.length > 0 && (
                <button onClick={exportFaultsCSV} style={{ ...btnBase, background: 'var(--gc)', color: 'var(--teal)', border: '0.5px solid var(--gb)', padding: '3px 8px' }}>
                  ↓ CSV
                </button>
              )}
            </div>
          </div>
          {faults.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--mint)', textAlign: 'center', padding: 8 }}>No faults reported.</p>
          ) : (
            faults.map((f) => (
              <div key={f.id} style={{ background: 'var(--al)', border: '0.5px solid var(--ab)', borderLeft: '3px solid var(--a)', borderRadius: 'var(--rads)', padding: '12px 14px', marginBottom: 8, opacity: f.resolved ? 0.45 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--amber-t)' }}>{f.fault_type}{f.bay_num != null ? ` — Bay ${f.bay_num}` : ''}</div>
                  <div style={{ fontSize: 10, color: 'rgba(239,159,39,0.5)' }}>{timeAgo(f.reported_at)}</div>
                </div>
                {f.description && <div style={{ fontSize: 11, color: 'rgba(239,159,39,0.85)', marginBottom: 6 }}>{f.description}</div>}
                {f.resolved ? (
                  <div style={{ fontSize: 10, color: 'var(--teal)', marginTop: 4 }}>✓ Resolved</div>
                ) : (
                  <button
                    onClick={() => handleResolveFault(f.id)}
                    disabled={resolvingFault === f.id}
                    style={{ ...btnBase, background: 'rgba(29,158,117,0.12)', color: 'var(--teal)', border: '0.5px solid rgba(29,158,117,0.3)', marginTop: 4, opacity: resolvingFault === f.id ? 0.5 : 1 }}
                  >
                    {resolvingFault === f.id ? '…' : '✓ Mark resolved'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Bay taken incidents — SM only */}
      {!isSuperAdmin && (
        <div style={{ background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)', borderRadius: 'var(--rad)', padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: '#F7C1C1', letterSpacing: '0.1em', textTransform: 'uppercase' }}>🚫 Bay taken incidents</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'rgba(247,193,193,0.6)' }}>{bayTaken.length > 0 ? `${bayTaken.length} reported` : 'None reported'}</span>
              {bayTaken.length > 0 && (
                <button onClick={exportBayTakenCSV} style={{ ...btnBase, background: 'var(--gc)', color: 'var(--teal)', border: '0.5px solid var(--gb)', padding: '3px 8px' }}>
                  ↓ CSV
                </button>
              )}
            </div>
          </div>
          {bayTaken.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--mint)', textAlign: 'center', padding: 8 }}>No incidents reported.</p>
          ) : (
            bayTaken.map((bt) => {
              const relatedFault = faults.find((f) => f.bay_num === bt.assigned_bay)
              return (
                <div key={bt.id} style={{ background: 'var(--rl)', border: '0.5px solid var(--rb)', borderLeft: '3px solid var(--r)', borderRadius: 'var(--rads)', padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#F7C1C1' }}>Bay {bt.assigned_bay} taken</div>
                    <div style={{ fontSize: 10, color: 'rgba(247,193,193,0.5)' }}>{timeAgo(bt.reported_at)}</div>
                  </div>
                  {bt.fault_type && <div style={{ fontSize: 11, color: 'rgba(247,193,193,0.85)', marginBottom: 2 }}>{bt.fault_type}</div>}
                  {bt.offender_plate && <div style={{ fontSize: 11, color: 'rgba(247,193,193,0.85)' }}>Offending plate: <strong style={{ color: '#fff' }}>{bt.offender_plate}</strong></div>}
                  {relatedFault && (
                    <div style={{ fontSize: 11, color: 'var(--amber-t)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ opacity: 0.7 }}>⚠️ Bay fault:</span> {relatedFault.fault_type}
                    </div>
                  )}
                  {bt.notes && <div style={{ fontSize: 11, color: 'rgba(247,193,193,0.7)', marginTop: 3 }}>{bt.notes}</div>}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Location flags — SA only */}
      {isSuperAdmin && (
        <div style={{ background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)', borderRadius: 'var(--rad)', padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="section-label" style={{ margin: 0 }}>Location flags</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>Warm outreach leads</span>
              <button onClick={fetchAll} disabled={refreshing}
                style={{ background: 'var(--gc)', border: '0.5px solid var(--gb)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: 'var(--teal)', cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}>
                {refreshing ? '...' : '↻ Refresh'}
              </button>
            </div>
          </div>

          {flagsError && (
            <div style={{ background: 'var(--al)', border: '0.5px solid var(--ab)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--amber-t)', marginBottom: 8 }}>
              ⚠ Could not load flags: {flagsError}
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 10 }}>
            Sites reported by users as needing ChargeQ. Use these to reach out to site owners.
          </p>

          {openFlags.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--mint)', textAlign: 'center', padding: 12 }}>No open flags.</p>
          ) : (
            openFlags.map((f) => (
              <div key={f.id} style={{ background: 'var(--bg3)', border: '0.5px solid rgba(29,158,117,0.15)', borderRadius: 'var(--rads)', padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cream)' }}>{f.station_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{timeAgo(f.reported_at)}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--teal)', marginBottom: f.notes ? 4 : 8 }}>{f.reason}</div>
                {f.notes && <div style={{ fontSize: 11, color: 'var(--mint)', marginBottom: 8 }}>{f.notes}</div>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleMarkActioned(f.id)}
                    disabled={actioning === f.id}
                    style={{ ...btnBase, background: 'var(--gc)', color: 'var(--teal)', border: '0.5px solid var(--gb)', opacity: actioning === f.id ? 0.5 : 1 }}
                  >
                    {actioning === f.id ? '...' : '✓ Mark actioned'}
                  </button>
                  <a
                    href={`mailto:hello@chargeq.com.au?subject=Site%20outreach%3A%20${encodeURIComponent(f.station_name)}&body=Hi%2C%0A%0AWe%20received%20a%20flag%20for%20${encodeURIComponent(f.station_name)}%20(${encodeURIComponent(f.reason)}).%0A%0A`}
                    style={{ ...btnBase, background: 'rgba(29,158,117,0.1)', color: 'var(--mint)', border: '0.5px solid rgba(29,158,117,0.25)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                  >
                    ✉ Contact site
                  </a>
                  <button
                    onClick={() => handleDelete(f.id, f.station_name)}
                    disabled={deleting === f.id}
                    style={{ ...btnBase, background: 'rgba(226,75,74,0.1)', color: '#F7C1C1', border: '0.5px solid rgba(226,75,74,0.25)', opacity: deleting === f.id ? 0.5 : 1 }}
                  >
                    {deleting === f.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          )}

          {actionedFlags.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <button
                onClick={() => setShowActioned((v) => !v)}
                style={{ ...btnBase, background: 'none', color: 'var(--text3)', border: '0.5px solid rgba(29,158,117,0.15)', width: '100%', padding: '6px 0', marginBottom: showActioned ? 8 : 0 }}
              >
                {showActioned ? `Hide actioned (${actionedFlags.length})` : `Show actioned (${actionedFlags.length})`}
              </button>

              {showActioned && actionedFlags.map((f) => (
                <div key={f.id} style={{ background: 'var(--bg3)', border: '0.5px solid rgba(29,158,117,0.08)', borderRadius: 'var(--rads)', padding: '10px 12px', marginBottom: 8, opacity: 0.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cream)' }}>{f.station_name}</div>
                    <div style={{ fontSize: 10, color: 'var(--teal)' }}>✓ actioned</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--teal)', marginBottom: f.notes ? 4 : 8 }}>{f.reason}</div>
                  {f.notes && <div style={{ fontSize: 11, color: 'var(--mint)', marginBottom: 8 }}>{f.notes}</div>}
                  <button
                    onClick={() => handleDelete(f.id, f.station_name)}
                    disabled={deleting === f.id}
                    style={{ ...btnBase, background: 'rgba(226,75,74,0.1)', color: '#F7C1C1', border: '0.5px solid rgba(226,75,74,0.25)', opacity: deleting === f.id ? 0.5 : 1 }}
                  >
                    {deleting === f.id ? '...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
