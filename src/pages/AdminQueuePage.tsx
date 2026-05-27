import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { useQueueStore } from '@/store/queueStore'
import { useAdminBayReady, useAdminRemoveFromQueue, useAdminNotifySMS, useAdminSimulateArrival } from '@/hooks/useAdmin'
import { useQueueRealtime } from '@/hooks/useQueue'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { CHARGER_INFO } from '@/utils'
import type { QueueEntry, Bay } from '@/types'

// ── Site manager: live queue for their site ───────────────────────────

function ManagerQueueView() {
  const siteKey = useAppStore((s) => s.siteKey)
  const { adminQueue, bays } = useQueueStore()
  const { markBayReady } = useAdminBayReady()
  const { removeFromQueue } = useAdminRemoveFromQueue()
  const { notifyDriver } = useAdminNotifySMS()
  const { simulateArrival, clearSimEntries } = useAdminSimulateArrival()
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
        <p style={{ fontSize: 13, color: 'var(--mint)', textAlign: 'center', padding: 16 }}>No drivers in queue</p>
      ) : (
        adminQueue.map((entry, i) => (
          <AdminQueueItem
            key={entry.id}
            entry={entry}
            rank={i + 1}
            isNext={i === 0}
            bays={bays}
            onBayReady={async (bayNum: number) => { await markBayReady(entry.id, entry.name, entry.phone, bayNum) }}
            onNotify={async () => { await notifyDriver(entry.name, entry.phone, entry.bayNum) }}
            onRemove={async () => { await removeFromQueue(entry.id, entry.name) }}
          />
        ))
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button
          onClick={simulateArrival}
          style={{
            flex: 1, height: 38, borderRadius: 8,
            background: 'var(--bg3)', border: '0.5px dashed rgba(29,158,117,0.4)',
            color: 'var(--teal)', fontFamily: '"DM Sans", sans-serif',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          + Simulate arrival
        </button>
        <button
          onClick={clearSimEntries}
          style={{
            height: 38, padding: '0 12px', borderRadius: 8,
            background: 'var(--bg3)', border: '0.5px dashed rgba(226,75,74,0.3)',
            color: 'rgba(247,193,193,0.6)', fontFamily: '"DM Sans", sans-serif',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          Clear test
        </button>
      </div>
    </div>
  )
}

// ── Super admin: all ChargeQ sites overview ───────────────────────────

interface SiteRow { id: string; name: string; active: boolean }
interface SiteStats { queueCount: number; waitMins: number; freeBays: number; totalBays: number }
interface SiteBay { num: number; status: string; plate: string | null; type?: string }
interface SiteEntry { id: string; plate: string; name: string; phone: string; charger: string; bay_num: number | null }
interface SiteFault { id: string; bay_num: number | null; fault_type: string; description: string | null; reported_at: string; resolved: boolean }
interface SiteBayTaken { id: string; assigned_bay: number; offender_plate: string | null; fault_type?: string | null; notes: string | null; reported_at: string }

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function downloadCSVData(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function SASitesView() {
  const [sites, setSites] = useState<SiteRow[]>([])
  const [stats, setStats] = useState<Record<string, SiteStats>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [siteBays, setSiteBays] = useState<SiteBay[]>([])
  const [siteQueue, setSiteQueue] = useState<SiteEntry[]>([])
  const [siteFaults, setSiteFaults] = useState<SiteFault[]>([])
  const [siteBayTaken, setSiteBayTaken] = useState<SiteBayTaken[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchSites() }, [])

  async function fetchSites() {
    setLoading(true)
    const { data } = await supabase.from('sites').select('id, name, active').order('name')
    if (data) {
      setSites(data)
      data.forEach((s) => fetchSiteStats(s.id))
    }
    setLoading(false)
  }

  async function fetchSiteStats(siteId: string) {
    const [qRes, bRes] = await Promise.all([
      supabase.rpc('get_site_queue_stats', { p_site_id: siteId }),
      supabase.from('bays').select('status').eq('site_id', siteId),
    ])
    const bays = bRes.data ?? []
    setStats((prev) => ({
      ...prev,
      [siteId]: {
        queueCount: qRes.data?.queue_count ?? 0,
        waitMins:   qRes.data?.wait_mins ?? 0,
        freeBays:   bays.filter((b) => b.status === 'free').length,
        totalBays:  bays.length,
      },
    }))
  }

  async function loadSiteDetail(siteId: string) {
    setLoadingDetail(true)
    const [bRes, qRes, fRes, btRes] = await Promise.all([
      supabase.from('bays').select('num, status, plate, type').eq('site_id', siteId).order('num'),
      supabase.from('queue_entries')
        .select('id, plate, name, phone, charger, bay_num')
        .eq('site_id', siteId)
        .in('status', ['waiting', 'ready'])
        .order('joined_at'),
      supabase.from('fault_reports').select('*').eq('site_id', siteId).order('reported_at', { ascending: false }).limit(20),
      supabase.from('bay_taken_incidents').select('*').eq('site_id', siteId).order('reported_at', { ascending: false }).limit(20),
    ])
    setSiteBays(bRes.data ?? [])
    setSiteQueue((qRes.data ?? []) as SiteEntry[])
    setSiteFaults((fRes.data ?? []) as SiteFault[])
    setSiteBayTaken((btRes.data ?? []) as SiteBayTaken[])
    setLoadingDetail(false)
  }

  function handleToggle(siteId: string) {
    if (expanded === siteId) { setExpanded(null); return }
    setExpanded(siteId)
    loadSiteDetail(siteId)
  }

  async function handleBayReady(siteId: string, entryId: string, bayNum: number | null) {
    await supabase.rpc('admin_mark_bay_ready', { p_site_id: siteId, p_entry_id: entryId, p_bay_num: bayNum })
    await loadSiteDetail(siteId)
    fetchSiteStats(siteId)
  }

  async function handleRemove(siteId: string, entryId: string) {
    await supabase.from('queue_entries').update({ status: 'cancelled' }).eq('id', entryId)
    setSiteQueue((prev) => prev.filter((e) => e.id !== entryId))
    fetchSiteStats(siteId)
  }

  async function handleSASetBayStatus(siteId: string, bayNum: number, status: 'free' | 'occupied' | 'fault', plate?: string) {
    await supabase.rpc('set_bay_status', { p_site_id: siteId, p_bay_num: bayNum, p_status: status, p_plate: plate ?? null })
    await loadSiteDetail(siteId)
    fetchSiteStats(siteId)
  }

  function downloadFaultsCSV(siteName: string) {
    const rows: string[][] = [['Bay', 'Fault Type', 'Description', 'Reported', 'Resolved']]
    siteFaults.forEach((f) => rows.push([
      f.bay_num != null ? String(f.bay_num) : '—',
      f.fault_type, f.description ?? '',
      new Date(f.reported_at).toLocaleString(), f.resolved ? 'Yes' : 'No',
    ]))
    downloadCSVData(rows, `${siteName.replace(/\s+/g,'_')}_fault_reports.csv`)
  }

  function downloadBayTakenCSV(siteName: string) {
    const rows: string[][] = [['Bay', 'Offender Plate', 'Notes', 'Reported']]
    siteBayTaken.forEach((bt) => rows.push([
      String(bt.assigned_bay), bt.offender_plate ?? '', bt.notes ?? '',
      new Date(bt.reported_at).toLocaleString(),
    ]))
    downloadCSVData(rows, `${siteName.replace(/\s+/g,'_')}_bay_taken_incidents.csv`)
  }

  async function downloadCSV(siteId: string, siteName: string) {
    const { data } = await supabase
      .from('queue_entries')
      .select('bay_num, charger, joined_at, updated_at, plate, name')
      .eq('site_id', siteId)
      .eq('status', 'left')
      .not('bay_num', 'is', null)
      .order('bay_num')

    if (!data || data.length === 0) {
      alert('No completed sessions to export for this site yet.')
      return
    }

    // Group by bay
    const byBay: Record<number, typeof data> = {}
    data.forEach((r) => {
      const b = r.bay_num as number
      if (!byBay[b]) byBay[b] = []
      byBay[b].push(r)
    })

    const rows = ['Bay No.,Total Sessions,Avg Time at Bay (mins),Most Common Charger,Charge % (Start→Finish)']
    Object.keys(byBay).sort((a, b) => Number(a) - Number(b)).forEach((bayNum) => {
      const entries = byBay[Number(bayNum)]
      const sessions = entries.length
      const avgMins = Math.round(
        entries.reduce((sum, e) => {
          const diff = new Date(e.updated_at).getTime() - new Date(e.joined_at).getTime()
          return sum + diff / 60000
        }, 0) / sessions
      )
      const chargerCounts: Record<string, number> = {}
      entries.forEach((e) => { chargerCounts[e.charger] = (chargerCounts[e.charger] ?? 0) + 1 })
      const topCharger = Object.entries(chargerCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—'
      rows.push(`${bayNum},${sessions},${avgMins},${topCharger},N/A - not tracked`)
    })

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${siteName.replace(/\s+/g, '_')}_bay_stats.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div style={{ padding: '14px 16px' }}>
      <AdminBadge icon="⬡" label="Super Admin — ChargeQ Sites" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 24, color: 'var(--mint)', fontSize: 13 }}>
        <div className="cq-spinner" /> Loading sites...
      </div>
    </div>
  )

  return (
    <div style={{ padding: '14px 16px' }}>
      <AdminBadge icon="⬡" label="Super Admin — ChargeQ Sites" />

      {sites.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--mint)', textAlign: 'center', padding: 24 }}>No sites configured.</p>
      )}

      {sites.map((site) => {
        const s = stats[site.id]
        const isOpen = expanded === site.id
        return (
          <div key={site.id} style={{
            background: 'var(--surf)',
            border: `0.5px solid ${isOpen ? 'rgba(29,158,117,0.4)' : 'rgba(29,158,117,0.18)'}`,
            borderRadius: 'var(--rad)', marginBottom: 10, overflow: 'hidden',
          }}>
            <button
              onClick={() => handleToggle(site.id)}
              style={{
                width: '100%', background: 'none', border: 'none',
                padding: '14px 14px', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: site.active ? 'var(--g)' : 'var(--text3)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--cream)', marginBottom: 3 }}>
                  {site.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mint)', display: 'flex', gap: 14 }}>
                  {s ? (
                    <>
                      <span>{s.queueCount} in queue{s.queueCount > 0 ? ` · ~${s.waitMins}min` : ''}</span>
                      <span>{s.freeBays}/{s.totalBays} bays free</span>
                    </>
                  ) : <span style={{ color: 'var(--text3)' }}>Loading…</span>}
                </div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--teal)', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>

            {isOpen && (
              <div style={{ borderTop: '0.5px solid rgba(29,158,117,0.15)', padding: '12px 14px' }}>
                {loadingDetail ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mint)', fontSize: 12 }}>
                    <div className="cq-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Loading…
                  </div>
                ) : (
                  <>
                    {siteBays.length > 0 && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div className="section-label" style={{ margin: 0 }}>Bay status & control</div>
                          <button
                            onClick={() => downloadCSV(site.id, site.name)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              background: 'var(--gc)', border: '0.5px solid var(--gb)',
                              borderRadius: 6, padding: '4px 10px',
                              fontSize: 10, color: 'var(--teal)', cursor: 'pointer',
                              fontFamily: '"DM Sans", sans-serif',
                            }}
                          >
                            ↓ CSV Stats
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                          {siteBays.map((bay) => (
                            <SABayControl
                              key={bay.num}
                              bay={bay}
                              onSet={(status, plate) => handleSASetBayStatus(site.id, bay.num, status, plate)}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Fault reports */}
                    {siteFaults.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--amber-t)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>⚠️ Fault reports ({siteFaults.length})</div>
                          <button
                            onClick={() => downloadFaultsCSV(site.name)}
                            style={{ background: 'var(--gc)', border: '0.5px solid var(--gb)', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: 'var(--teal)', cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
                          >↓ CSV</button>
                        </div>
                        {siteFaults.slice(0, 5).map((f) => (
                          <div key={f.id} style={{ background: 'var(--al)', border: '0.5px solid var(--ab)', borderLeft: '2px solid var(--a)', borderRadius: 6, padding: '8px 10px', marginBottom: 5, opacity: f.resolved ? 0.5 : 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--amber-t)' }}>{f.fault_type}{f.bay_num != null ? ` — Bay ${f.bay_num}` : ''}</div>
                              <div style={{ fontSize: 9, color: 'rgba(239,159,39,0.5)' }}>{timeAgo(f.reported_at)}</div>
                            </div>
                            {f.description && <div style={{ fontSize: 10, color: 'rgba(239,159,39,0.7)', marginTop: 2 }}>{f.description}</div>}
                            {f.resolved && <div style={{ fontSize: 9, color: 'var(--teal)', marginTop: 2 }}>✓ Resolved</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bay taken incidents */}
                    {siteBayTaken.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 500, color: '#F7C1C1', letterSpacing: '0.1em', textTransform: 'uppercase' }}>🚫 Bay taken ({siteBayTaken.length})</div>
                          <button
                            onClick={() => downloadBayTakenCSV(site.name)}
                            style={{ background: 'var(--gc)', border: '0.5px solid var(--gb)', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: 'var(--teal)', cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
                          >↓ CSV</button>
                        </div>
                        {siteBayTaken.slice(0, 5).map((bt) => {
                          const relatedFault = siteFaults.find((f) => f.bay_num === bt.assigned_bay)
                          return (
                            <div key={bt.id} style={{ background: 'var(--rl)', border: '0.5px solid var(--rb)', borderLeft: '2px solid var(--r)', borderRadius: 6, padding: '8px 10px', marginBottom: 5 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#F7C1C1' }}>Bay {bt.assigned_bay} taken{bt.fault_type ? ` · ${bt.fault_type}` : ''}{bt.offender_plate ? ` · ${bt.offender_plate}` : ''}</div>
                                <div style={{ fontSize: 9, color: 'rgba(247,193,193,0.5)' }}>{timeAgo(bt.reported_at)}</div>
                              </div>
                              {relatedFault && (
                                <div style={{ fontSize: 10, color: 'var(--amber-t)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ opacity: 0.7 }}>⚠️ Bay fault:</span> {relatedFault.fault_type}
                                </div>
                              )}
                              {bt.notes && <div style={{ fontSize: 10, color: 'rgba(247,193,193,0.7)', marginTop: 2 }}>{bt.notes}</div>}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div className="section-label" style={{ marginBottom: 8 }}>Live queue</div>
                    {siteQueue.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--mint)', textAlign: 'center', padding: 8 }}>No drivers in queue.</p>
                    ) : (
                      siteQueue.map((entry, i) => {
                        const ci = CHARGER_INFO[entry.charger as keyof typeof CHARGER_INFO]
                        return (
                          <div key={entry.id} style={{
                            background: i === 0 ? 'var(--al)' : 'var(--bg3)',
                            border: `0.5px solid ${i === 0 ? 'var(--ab)' : 'rgba(29,158,117,0.18)'}`,
                            borderRadius: 'var(--rads)', padding: '10px 12px', marginBottom: 8,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                              <div style={{
                                width: 22, height: 22, borderRadius: '50%',
                                background: i === 0 ? 'var(--al)' : 'var(--gl)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700,
                                color: i === 0 ? 'var(--amber-t)' : 'var(--g)', flexShrink: 0,
                              }}>{i + 1}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, fontSize: 12, color: 'var(--cream)' }}>{entry.plate}</div>
                                <div style={{ fontSize: 10, color: 'var(--mint)' }}>{entry.name}</div>
                              </div>
                              {ci && <span style={{ fontSize: 10, color: 'var(--teal)' }}>{ci.icon} {ci.name}</span>}
                              {i === 0 && <span style={{ fontSize: 9, color: 'var(--amber-t)', background: 'rgba(239,159,39,0.15)', borderRadius: 10, padding: '2px 6px', border: '0.5px solid var(--ab)' }}>Next</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => handleBayReady(site.id, entry.id, entry.bay_num)}
                                style={{ flex: 1, height: 28, borderRadius: 6, border: 'none', background: 'var(--g)', color: '#fff', fontSize: 10, fontWeight: 500, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
                              >
                                Bay ready ✓
                              </button>
                              <button
                                onClick={() => handleRemove(site.id, entry.id)}
                                style={{ flex: 1, height: 28, borderRadius: 6, border: '0.5px solid var(--rb)', background: 'var(--rl)', color: '#F7C1C1', fontSize: 10, fontWeight: 500, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Page entry — splits on appMode ────────────────────────────────────

export default function AdminQueuePage() {
  const appMode = useAppStore((s) => s.appMode)
  return appMode === 'superadmin' ? <SASitesView /> : <ManagerQueueView />
}

// ── Queue item (manager view) ─────────────────────────────────────────

function AdminQueueItem({
  entry, rank, isNext, bays, onBayReady, onNotify, onRemove
}: {
  entry: QueueEntry
  rank: number
  isNext: boolean
  bays: Bay[]
  onBayReady: (bayNum: number) => Promise<void>
  onNotify: () => void
  onRemove: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [pickingBay, setPickingBay] = useState(false)
  const chargerInfo = CHARGER_INFO[entry.charger]
  const freeBays = bays.filter((b) => b.status === 'free' && b.type === entry.charger)

  async function handlePickBay(bayNum: number) {
    setPickingBay(false)
    setLoading(true)
    await onBayReady(bayNum)
    setLoading(false)
  }

  return (
    <div style={{
      background: isNext ? 'var(--al)' : 'var(--bg3)',
      border: `0.5px solid ${isNext ? 'var(--ab)' : 'rgba(29,158,117,0.18)'}`,
      borderRadius: 'var(--rads)', padding: 12, marginBottom: 8,
    }}>
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
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        {[
          chargerInfo ? `${chargerInfo.icon} ${chargerInfo.name}` : entry.charger,
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

      {pickingBay ? (
        <div style={{ background: 'var(--gc)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: 'var(--mint)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Select a free bay for this driver:
          </div>
          {freeBays.length === 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(247,193,193,0.8)', marginBottom: 8 }}>
              No free {chargerInfo?.name ?? entry.charger} bays available right now.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {freeBays.map((bay) => (
                <button
                  key={bay.num}
                  onClick={() => handlePickBay(bay.num)}
                  style={{
                    height: 36, minWidth: 56, borderRadius: 8,
                    border: '0.5px solid var(--gb)', background: 'var(--g)',
                    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif',
                  }}
                >
                  {bay.num}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setPickingBay(false)}
            style={{ fontSize: 11, color: 'var(--mint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: '"DM Sans", sans-serif' }}
          >
            ← Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setPickingBay(true)}
            disabled={loading}
            style={{
              flex: 1, height: 32, borderRadius: 6, border: 'none',
              background: freeBays.length > 0 ? 'var(--g)' : 'var(--gc)',
              color: freeBays.length > 0 ? '#fff' : 'var(--teal)',
              fontSize: 11, fontWeight: 500, cursor: loading ? 'wait' : 'pointer',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            {loading ? '…' : freeBays.length > 0 ? `Assign bay ✓` : 'No bays free'}
          </button>
          <button
            onClick={onNotify}
            style={{ flex: 1, height: 32, borderRadius: 6, border: '0.5px solid var(--ab)', background: 'var(--al)', color: 'var(--amber-t)', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
          >
            Notify 📱
          </button>
          <button
            onClick={onRemove}
            style={{ flex: 1, height: 32, borderRadius: 6, border: '0.5px solid var(--rb)', background: 'var(--rl)', color: '#F7C1C1', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

// ── SA: compact bay control card ──────────────────────────────────────

function SABayControl({ bay, onSet }: {
  bay: SiteBay
  onSet: (status: 'free' | 'occupied' | 'fault', plate?: string) => Promise<void>
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showPlate, setShowPlate] = useState(false)
  const [plateInput, setPlateInput] = useState('')

  const isOcc   = bay.status === 'occupied'
  const isFault = bay.status === 'fault'
  const isFree  = bay.status === 'free'
  const ci = bay.type ? CHARGER_INFO[bay.type as keyof typeof CHARGER_INFO] : null

  async function set(status: 'free' | 'occupied' | 'fault', plate?: string) {
    setLoading(status)
    await onSet(status, plate)
    setLoading(null)
    setShowPlate(false)
    setPlateInput('')
  }

  return (
    <div style={{
      background: isOcc ? 'rgba(226,75,74,0.08)' : isFault ? 'rgba(239,159,39,0.08)' : 'var(--gc)',
      border: `1px solid ${isOcc ? 'var(--rb)' : isFault ? 'var(--ab)' : 'var(--gb)'}`,
      borderRadius: 'var(--rads)', padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: showPlate ? 8 : 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 7, flexShrink: 0,
          background: isOcc ? 'var(--rl)' : isFault ? 'var(--al)' : 'var(--gl)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800,
          color: isOcc ? '#F7C1C1' : isFault ? 'var(--amber-t)' : 'var(--teal)',
        }}>{bay.num}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cream)' }}>Bay {bay.num}</div>
          {ci && <div style={{ fontSize: 10, color: 'var(--mint)' }}>{ci.icon} {ci.name}</div>}
        </div>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 10,
          background: isOcc ? 'var(--rl)' : isFault ? 'var(--al)' : 'var(--gl)',
          color: isOcc ? '#F7C1C1' : isFault ? 'var(--amber-t)' : 'var(--teal)',
          border: `0.5px solid ${isOcc ? 'var(--rb)' : isFault ? 'var(--ab)' : 'var(--gb)'}`,
        }}>
          {isOcc ? `Occupied${bay.plate ? ` · ${bay.plate}` : ''}` : isFault ? 'Maintenance' : 'Free'}
        </span>
      </div>

      {showPlate && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Plate (optional)"
            value={plateInput}
            onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
            autoFocus
            style={{
              flex: 1, height: 32, padding: '0 10px',
              background: 'var(--bg3)', border: '1px solid rgba(29,158,117,0.3)',
              borderRadius: 6, color: 'var(--cream)',
              fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700,
              letterSpacing: '0.08em', outline: 'none', textTransform: 'uppercase',
            }}
          />
          <button onClick={() => set('occupied', plateInput || undefined)} disabled={!!loading}
            style={{ height: 32, padding: '0 12px', borderRadius: 6, border: 'none', background: 'var(--r)', color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}>
            {loading === 'occupied' ? '…' : 'Confirm'}
          </button>
          <button onClick={() => { setShowPlate(false); setPlateInput('') }}
            style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '0.5px solid rgba(29,158,117,0.2)', background: 'transparent', color: 'var(--text3)', fontSize: 10, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}>
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
        {[
          { label: 'Bay Taken', status: 'occupied' as const, active: isOcc, onClick: () => setShowPlate(true) },
          { label: 'Bay Free',  status: 'free'     as const, active: isFree, onClick: () => set('free') },
          { label: 'Maint.',    status: 'fault'    as const, active: isFault, onClick: () => set('fault') },
        ].map(({ label, status, active, onClick }) => (
          <button
            key={status}
            disabled={active || !!loading}
            onClick={onClick}
            style={{
              height: 28, borderRadius: 5, fontSize: 10, fontWeight: 500,
              cursor: active ? 'default' : 'pointer', fontFamily: '"DM Sans", sans-serif',
              background: active
                ? (status === 'occupied' ? 'rgba(226,75,74,0.08)' : status === 'fault' ? 'rgba(239,159,39,0.08)' : 'rgba(29,158,117,0.08)')
                : (status === 'occupied' ? 'var(--rl)' : status === 'fault' ? 'var(--al)' : 'var(--gl)'),
              color: active
                ? (status === 'occupied' ? 'rgba(247,193,193,0.35)' : status === 'fault' ? 'rgba(239,159,39,0.35)' : 'rgba(93,202,165,0.35)')
                : (status === 'occupied' ? '#F7C1C1' : status === 'fault' ? 'var(--amber-t)' : 'var(--teal)'),
              border: `0.5px solid ${active
                ? (status === 'occupied' ? 'rgba(226,75,74,0.15)' : status === 'fault' ? 'rgba(239,159,39,0.15)' : 'rgba(29,158,117,0.15)')
                : (status === 'occupied' ? 'var(--rb)' : status === 'fault' ? 'var(--ab)' : 'var(--gb)')}`,
            }}
          >
            {loading === status ? '…' : label}
          </button>
        ))}
      </div>
    </div>
  )
}
