import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { useToast } from '@/store/appStore'
import { AdminBadge } from '@/components/admin/AdminBadge'

interface SiteAd {
  id: string
  site_id: string
  emoji: string
  header: string
  body: string
  location: string | null
  code: string | null
  active: boolean
  ever_active: boolean
  created_at: string
}

const EMOJI_OPTIONS = ['🍕','🍔','🍣','🍩','☕','🧃','🛍️','💈','🏪','🎯','🎪','⚡','🌿','🎁','🧁','🥗','🍦','🍺','💊','👟','📱','🚗','🏋️','🎵']

const defaultForm = { emoji: '⚡', header: '', body: '', location: '', code: '' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export default function AdminAdsPage() {
  const siteKey = useAppStore((s) => s.siteKey)
  const toast = useToast()

  const [ads, setAds] = useState<SiteAd[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<SiteAd | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)

  useEffect(() => { loadAds() }, [siteKey]) // eslint-disable-line

  async function loadAds() {
    setLoading(true)
    const { data, error } = await db
      .from('site_ads')
      .select('*')
      .eq('site_id', siteKey)
      .order('created_at', { ascending: false })
    if (!error) setAds((data ?? []) as SiteAd[])
    setLoading(false)
  }

  function openNew() {
    setEditTarget(null)
    setForm(defaultForm)
    setShowEmojiPicker(false)
    setShowForm(true)
  }

  function openEdit(ad: SiteAd) {
    setEditTarget(ad)
    setForm({ emoji: ad.emoji, header: ad.header, body: ad.body, location: ad.location ?? '', code: ad.code ?? '' })
    setShowEmojiPicker(false)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.header.trim()) { toast('Please add a header for the ad.'); return }
    if (!form.body.trim()) { toast('Please add body text for the ad.'); return }
    setSaving(true)

    const payload = {
      site_id:    siteKey,
      emoji:      form.emoji,
      header:     form.header.trim(),
      body:       form.body.trim(),
      location:   form.location.trim() || null,
      code:       form.code.trim() || null,
      updated_at: new Date().toISOString(),
    }

    if (editTarget) {
      const { error } = await db.from('site_ads').update(payload).eq('id', editTarget.id)
      if (error) {
        console.error('Ad update error:', error)
        toast('Could not save ad. Please try again.')
        setSaving(false)
        return
      }
      toast('Ad updated ✓')
    } else {
      const { error } = await db.from('site_ads').insert({ ...payload, active: false, ever_active: false })
      if (error) {
        console.error('Ad insert error:', error)
        toast('Could not create ad. Please try again.')
        setSaving(false)
        return
      }
      toast('Ad saved as draft ✓')
    }

    setSaving(false)
    setShowForm(false)
    setEditTarget(null)
    loadAds()
  }

  async function handleLaunch(ad: SiteAd) {
    setActioning(ad.id)
    // Move current live ad → previous
    await db.from('site_ads')
      .update({ active: false, ever_active: true, updated_at: new Date().toISOString() })
      .eq('site_id', siteKey)
      .eq('active', true)
    // Activate this ad
    const { error } = await db.from('site_ads')
      .update({ active: true, ever_active: true, updated_at: new Date().toISOString() })
      .eq('id', ad.id)
    if (error) { toast('Could not launch ad.'); setActioning(null); return }
    toast(`"${ad.header}" is now live ✓`)
    setActioning(null)
    loadAds()
  }

  async function handleDeactivate(ad: SiteAd) {
    setActioning(ad.id)
    const { error } = await db.from('site_ads')
      .update({ active: false, ever_active: true, updated_at: new Date().toISOString() })
      .eq('id', ad.id)
    if (error) { toast('Could not deactivate ad.'); setActioning(null); return }
    toast('Ad moved to Previous ✓')
    setActioning(null)
    loadAds()
  }

  async function handleDelete(ad: SiteAd) {
    if (!window.confirm(`Delete "${ad.header}"? This cannot be undone.`)) return
    await db.from('site_ads').delete().eq('id', ad.id)
    toast('Ad deleted')
    loadAds()
  }

  const live     = ads.filter((a) => a.active)
  const drafts   = ads.filter((a) => !a.active && !a.ever_active)
  const previous = ads.filter((a) => !a.active && a.ever_active)

  return (
    <div style={{ padding: '14px 16px' }}>
      <AdminBadge icon="📣" label="Admin — Onsite Advertising" />

      <p style={{ fontSize: 12, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 12 }}>
        Create ads that display to drivers while they wait. Only one ad is live at a time.
      </p>

      <button
        onClick={openNew}
        style={{
          width: '100%', height: 42, borderRadius: 8,
          border: '0.5px dashed rgba(29,158,117,0.5)',
          background: 'var(--gc)', color: 'var(--teal)',
          fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        + Create new ad
      </button>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mint)', fontSize: 13, padding: 16 }}>
          <div className="cq-spinner" /> Loading ads...
        </div>
      ) : (
        <>
          {/* ── Live ── */}
          <SectionLabel icon="🟢" label="Live ad" count={live.length} />
          {live.length === 0 ? (
            <EmptyState text="No ad is currently live." />
          ) : (
            live.map((ad) => (
              <AdCard
                key={ad.id}
                ad={ad}
                variant="live"
                onEdit={() => openEdit(ad)}
                onDeactivate={() => handleDeactivate(ad)}
                onDelete={() => handleDelete(ad)}
                actioning={actioning === ad.id}
              />
            ))
          )}

          {/* ── Drafts ── */}
          <SectionLabel icon="✏️" label="Draft ads" count={drafts.length} style={{ marginTop: 16 }} />
          {drafts.length === 0 ? (
            <EmptyState text="No drafts. Click '+ Create new ad' to get started." />
          ) : (
            drafts.map((ad) => (
              <AdCard
                key={ad.id}
                ad={ad}
                variant="draft"
                onEdit={() => openEdit(ad)}
                onLaunch={() => handleLaunch(ad)}
                onDelete={() => handleDelete(ad)}
                actioning={actioning === ad.id}
              />
            ))
          )}

          {/* ── Previous ── */}
          {previous.length > 0 && (
            <>
              <SectionLabel icon="🕐" label="Previous ads" count={previous.length} style={{ marginTop: 16 }} />
              {previous.map((ad) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  variant="previous"
                  onEdit={() => openEdit(ad)}
                  onLaunch={() => handleLaunch(ad)}
                  onDelete={() => handleDelete(ad)}
                  actioning={actioning === ad.id}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* ── Create / Edit form sheet ── */}
      {showForm && (
        <AdFormSheet
          form={form}
          setForm={setForm}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          isEdit={!!editTarget}
          saving={saving}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
        />
      )}
    </div>
  )
}

// ── Section label ────────────────────────────────────────────────────

function SectionLabel({ icon, label, count, style }: { icon: string; label: string; count: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, ...style }}>
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--teal)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 10, padding: '1px 6px' }}>{count}</span>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0 4px', marginBottom: 4 }}>{text}</p>
}

// ── Ad card ─────────────────────────────────────────────────────────

function AdCard({ ad, variant, onEdit, onLaunch, onDeactivate, onDelete, actioning }: {
  ad: SiteAd
  variant: 'live' | 'draft' | 'previous'
  onEdit: () => void
  onLaunch?: () => void
  onDeactivate?: () => void
  onDelete: () => void
  actioning: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const borderColor = variant === 'live'
    ? 'rgba(29,158,117,0.6)'
    : variant === 'previous'
    ? 'rgba(240,239,232,0.1)'
    : 'rgba(29,158,117,0.2)'

  return (
    <div style={{
      background: 'var(--surf)', border: `0.5px solid ${borderColor}`,
      borderRadius: 'var(--rad)', marginBottom: 8, overflow: 'hidden',
      position: 'relative', opacity: variant === 'previous' ? 0.75 : 1,
    }}>
      {variant === 'live' && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--g)' }} />}

      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '12px 14px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <span style={{ fontSize: 22, flexShrink: 0 }}>{ad.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.header}</div>
          <div style={{ fontSize: 11, color: 'var(--mint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.body}</div>
        </div>
        {variant === 'live' && (
          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: 'var(--gl)', color: 'var(--teal)', border: '0.5px solid var(--gb)', flexShrink: 0, fontWeight: 600 }}>
            LIVE
          </span>
        )}
        <span style={{ fontSize: 10, color: 'var(--text3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▼</span>
      </button>

      {/* Expanded preview + actions */}
      {expanded && (
        <div style={{ borderTop: '0.5px solid rgba(29,158,117,0.1)', padding: '12px 14px' }}>
          <AdPreview ad={ad} />
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {variant === 'live' && (
              <button
                onClick={onDeactivate}
                disabled={actioning}
                style={actionBtn('rgba(226,75,74,0.15)', '#F7C1C1', actioning)}
              >
                {actioning ? '…' : 'Deactivate'}
              </button>
            )}
            {(variant === 'draft' || variant === 'previous') && (
              <button
                onClick={onLaunch}
                disabled={actioning}
                style={actionBtn('var(--g)', '#fff', actioning)}
              >
                {actioning ? '…' : variant === 'previous' ? 'Relaunch' : 'Launch'}
              </button>
            )}
            <button onClick={onEdit} style={actionBtn('var(--gc)', 'var(--teal)', false, 'var(--gb)')}>
              Edit
            </button>
            <button onClick={onDelete} style={{ height: 30, width: 30, borderRadius: 6, border: '0.5px solid rgba(226,75,74,0.3)', background: 'transparent', color: '#F7C1C1', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function actionBtn(bg: string, color: string, disabled: boolean, border?: string): React.CSSProperties {
  return {
    flex: 1, height: 30, borderRadius: 6, border: border ? `0.5px solid ${border}` : 'none',
    background: bg, color, fontSize: 11, fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: '"DM Sans", sans-serif', opacity: disabled ? 0.5 : 1,
  }
}

// ── Ad preview (matches driver-facing render) ─────────────────────

function AdPreview({ ad }: { ad: Pick<SiteAd, 'emoji' | 'header' | 'body' | 'location' | 'code'> }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(239,159,39,0.12), rgba(239,159,39,0.06))',
      border: '0.5px solid rgba(239,159,39,0.3)',
      borderRadius: 'var(--rad)', overflow: 'hidden', position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 9, color: 'rgba(250,199,117,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sponsored</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0, background: 'rgba(239,159,39,0.15)', border: '1px solid rgba(239,159,39,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
          {ad.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--cream)', marginBottom: 2 }}>{ad.header}</div>
          <div style={{ fontSize: 11, color: 'rgba(250,199,117,0.8)', lineHeight: 1.5, marginBottom: ad.location ? 8 : 0 }}>{ad.body}</div>
          {ad.location && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(239,159,39,0.2)', border: '0.5px solid rgba(239,159,39,0.5)', borderRadius: 20, padding: '4px 10px', fontSize: 10, fontWeight: 600, color: '#FAC775', letterSpacing: '0.04em' }}>
              📍 {ad.location}
            </div>
          )}
        </div>
      </div>
      {ad.code && (
        <div style={{ borderTop: '0.5px solid rgba(239,159,39,0.2)', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.15)' }}>
          <span style={{ fontSize: 11, color: 'rgba(250,199,117,0.6)' }}>Show code at counter:</span>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#FAC775', letterSpacing: '0.12em' }}>{ad.code}</span>
        </div>
      )}
    </div>
  )
}

// ── Create / Edit form sheet ─────────────────────────────────────

function AdFormSheet({ form, setForm, showEmojiPicker, setShowEmojiPicker, isEdit, saving, onSave, onClose }: {
  form: typeof defaultForm
  setForm: React.Dispatch<React.SetStateAction<typeof defaultForm>>
  showEmojiPicker: boolean
  setShowEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>
  isEdit: boolean
  saving: boolean
  onSave: () => void
  onClose: () => void
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: 'var(--bg3)', border: '0.5px solid rgba(29,158,117,0.25)',
    borderRadius: 'var(--rads)', color: 'var(--cream)',
    fontFamily: '"DM Sans", sans-serif', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, color: 'var(--teal)',
    marginBottom: 6, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase',
  }

  const canSave = form.header.trim().length > 0 && form.body.trim().length > 0

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg2)', border: '0.5px solid rgba(29,158,117,0.3)', borderTop: '2px solid var(--g)', borderRadius: '20px 20px 0 0', padding: '20px 20px max(28px,env(safe-area-inset-bottom,28px))', width: '100%', maxWidth: 480, maxHeight: '94vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--g)', marginBottom: 16 }}>
          {isEdit ? 'Edit ad' : 'New ad'}
        </div>

        {/* Emoji */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Brand icon</label>
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            style={{ width: 56, height: 56, borderRadius: 12, border: `1.5px solid ${showEmojiPicker ? 'var(--g)' : 'rgba(29,158,117,0.3)'}`, background: 'var(--bg3)', fontSize: 28, cursor: 'pointer' }}
          >
            {form.emoji}
          </button>
          {showEmojiPicker && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => { setForm((f) => ({ ...f, emoji: e })); setShowEmojiPicker(false) }}
                  style={{ width: 40, height: 40, borderRadius: 8, border: `1.5px solid ${form.emoji === e ? 'var(--g)' : 'rgba(29,158,117,0.2)'}`, background: form.emoji === e ? 'var(--gl)' : 'var(--bg3)', fontSize: 20, cursor: 'pointer' }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Header</label>
          <input value={form.header} onChange={(e) => setForm((f) => ({ ...f, header: e.target.value }))} placeholder="e.g. Krispy Kreme — Ampol Foodary" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Body text</label>
          <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="e.g. Show this ad at the counter for a FREE donut while you wait! ⚡" rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Location <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
          <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. 50m away · Open now" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Promo code <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
          <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. CQ-FREE" style={{ ...inputStyle, fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.1em', fontSize: 14 }} />
        </div>

        {/* Live preview */}
        {form.header && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Preview</div>
            <AdPreview ad={{ ...form, location: form.location || null, code: form.code || null }} />
          </div>
        )}

        <button
          onClick={onSave}
          disabled={saving || !canSave}
          style={{
            width: '100%', height: 48,
            background: canSave ? 'var(--g)' : 'rgba(29,158,117,0.3)',
            color: '#fff', border: 'none', borderRadius: 'var(--rads)',
            fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
            cursor: canSave && !saving ? 'pointer' : 'not-allowed', marginBottom: 8,
          }}
        >
          {saving ? 'Saving...' : isEdit ? 'Save changes ✓' : 'Save as draft ✓'}
        </button>
        <button onClick={onClose} style={{ width: '100%', height: 40, background: 'transparent', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: 'var(--rads)', color: 'var(--mint)', fontSize: 13, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
