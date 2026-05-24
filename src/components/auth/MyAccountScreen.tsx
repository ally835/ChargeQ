import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useSignOut, useAddVehicle } from '@/hooks/useAuth'
import { getUserInitials, CHARGER_INFO } from '@/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/store/appStore'
import { PortSelector } from '@/components/queue/PortSelector'
import type { ChargerType, PortSide, Vehicle } from '@/types'

interface MyAccountScreenProps {
  onBack: () => void
}

type Tab = 'garage' | 'account'

const CHARGER_OPTIONS: { id: ChargerType; label: string; icon: string }[] = [
  { id: 'ccs2',  label: 'CCS2 / DC Fast (50–350 kW)', icon: '⚡' },
  { id: 'type2', label: 'Type 2 / AC (7–22 kW)',       icon: '🔌' },
  { id: 'chd',   label: 'CHAdeMO (50–100 kW)',          icon: '🔗' },
  { id: 'tesla', label: 'Tesla / NACS (Up to 250 kW)', icon: '🚗' },
]

const PORT_OPTIONS: { id: PortSide; label: string; icon: string }[] = [
  { id: 'fl', label: 'Front left',    icon: '↖' },
  { id: 'fr', label: 'Front right',   icon: '↗' },
  { id: 'fc', label: 'Front centre',  icon: '↑' },
  { id: 'rl', label: 'Rear left',     icon: '↙' },
  { id: 'rr', label: 'Rear right',    icon: '↘' },
  { id: 'dm', label: 'Driver side',   icon: '←' },
  { id: 'pm', label: 'Passenger side',icon: '→' },
]

// ── Edit Vehicle Form ─────────────────────────────────────────────────

function EditVehicleForm({
  vehicle,
  onSave,
  onCancel,
}: {
  vehicle: Vehicle
  onSave: (updated: Partial<Vehicle>) => void
  onCancel: () => void
}) {
  const [plate, setPlate] = useState(vehicle.plate)
  const [nick, setNick]   = useState(vehicle.nick === vehicle.plate ? '' : vehicle.nick)
  const [charger, setCharger]   = useState<ChargerType>(vehicle.charger)
  const [portSide, setPortSide] = useState<PortSide | ''>(vehicle.portSide ?? '')

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 12px',
    background: 'var(--bg3)', border: '0.5px solid rgba(29,158,117,0.25)',
    borderRadius: 'var(--rads)', color: 'var(--cream)',
    fontFamily: '"DM Sans", sans-serif', fontSize: 14, outline: 'none',
    WebkitAppearance: 'none',
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 14, padding: 16, marginBottom: 10 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--g)', marginBottom: 14 }}>
        ✏️ Edit vehicle
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', marginBottom: 5, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Plate</label>
        <input type="text" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())}
          style={{ ...inputStyle, fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.1)' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(29,158,117,0.25)'; e.target.style.boxShadow = '' }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', marginBottom: 5, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Nickname <span style={{ color: 'var(--text3)', textTransform: 'none' }}>(optional)</span>
        </label>
        <input type="text" placeholder="e.g. My Tesla, Work car" value={nick} onChange={(e) => setNick(e.target.value)}
          style={inputStyle}
          onFocus={(e) => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.1)' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(29,158,117,0.25)'; e.target.style.boxShadow = '' }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', marginBottom: 6, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Charger type</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {CHARGER_OPTIONS.map((c) => (
            <button key={c.id} onClick={() => setCharger(c.id)} style={{
              border: `1.5px solid ${charger === c.id ? 'var(--g)' : 'rgba(29,158,117,0.2)'}`,
              borderRadius: 10, padding: '8px 8px', cursor: 'pointer', textAlign: 'left',
              background: charger === c.id ? 'var(--gl)' : 'var(--bg3)', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              <span style={{ fontSize: 11, color: charger === c.id ? 'var(--teal)' : 'var(--cream)' }}>
                {c.label.split('(')[0].trim()}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', marginBottom: 6, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Port location</label>
        <PortSelector value={portSide} onChange={(p) => setPortSide(p)} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onSave({ plate: plate.trim().toUpperCase(), nick: nick.trim() || plate.trim().toUpperCase(), charger, portSide: portSide || undefined })}
          style={{ flex: 1, height: 40, background: 'var(--g)', color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Save changes
        </button>
        <button
          onClick={onCancel}
          style={{ flex: 1, height: 40, background: 'transparent', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: 10, color: 'var(--mint)', fontSize: 13, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Add Vehicle Form ──────────────────────────────────────────────────

function AddVehicleForm({ onClose }: { onClose: () => void }) {
  const [plate, setPlate]       = useState('')
  const [nick, setNick]         = useState('')
  const [charger, setCharger]   = useState<ChargerType | ''>('')
  const [portSide, setPortSide] = useState<PortSide | ''>('')
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const { addVehicleToAccount, loading } = useAddVehicle()
  const user = useAuthStore((s) => s.user)

  async function handleAdd() {
    const e: Record<string, string> = {}
    if (!plate.trim()) e.plate = 'Plate required'
    if (!charger) e.charger = 'Charger type required'
    // Check for duplicate plate against existing vehicles in store
    const normPlate = plate.trim().toUpperCase()
    if (user?.vehicles.some((v) => v.plate.toUpperCase() === normPlate)) {
      e.plate = 'This plate is already in your garage'
    }
    setErrors(e)
    if (Object.keys(e).length > 0) return

    const ok = await addVehicleToAccount({
      plate, nick, charger: charger as ChargerType,
      portSide: portSide || undefined,
    })
    if (ok) onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 12px',
    background: 'var(--bg3)', border: '0.5px solid rgba(29,158,117,0.25)',
    borderRadius: 'var(--rads)', color: 'var(--cream)',
    fontFamily: '"DM Sans", sans-serif', fontSize: 14, outline: 'none',
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 14, padding: 16, marginBottom: 10 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--g)', marginBottom: 14 }}>
        ➕ Add new vehicle
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', marginBottom: 5, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Plate *</label>
        <input type="text" placeholder="e.g. ABC 123" value={plate} onChange={(e) => { setPlate(e.target.value.toUpperCase()); setErrors((p) => ({ ...p, plate: '' })) }}
          style={{ ...inputStyle, fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderColor: errors.plate ? 'var(--r)' : undefined }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--g)' }}
          onBlur={(e) => { e.target.style.borderColor = errors.plate ? 'var(--r)' : 'rgba(29,158,117,0.25)' }}
        />
        {errors.plate && <div style={{ fontSize: 11, color: '#F7C1C1', marginTop: 3 }}>{errors.plate}</div>}
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', marginBottom: 5, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Nickname <span style={{ color: 'var(--text3)', textTransform: 'none' }}>(optional)</span>
        </label>
        <input type="text" placeholder="e.g. Partner's car" value={nick} onChange={(e) => setNick(e.target.value)}
          style={inputStyle}
          onFocus={(e) => { e.target.style.borderColor = 'var(--g)' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(29,158,117,0.25)' }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', marginBottom: 6, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Charger type *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {CHARGER_OPTIONS.map((c) => (
            <button key={c.id} onClick={() => { setCharger(c.id); setErrors((p) => ({ ...p, charger: '' })) }} style={{
              border: `1.5px solid ${charger === c.id ? 'var(--g)' : errors.charger ? 'var(--r)' : 'rgba(29,158,117,0.2)'}`,
              borderRadius: 10, padding: '8px 8px', cursor: 'pointer', textAlign: 'left',
              background: charger === c.id ? 'var(--gl)' : 'var(--bg3)', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              <span style={{ fontSize: 11, color: charger === c.id ? 'var(--teal)' : 'var(--cream)' }}>{c.label.split('(')[0].trim()}</span>
            </button>
          ))}
        </div>
        {errors.charger && <div style={{ fontSize: 11, color: '#F7C1C1', marginTop: 3 }}>{errors.charger}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--teal)', marginBottom: 6, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Port location</label>
        <PortSelector value={portSide} onChange={(p) => setPortSide(p)} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleAdd}
          disabled={loading}
          style={{ flex: 1, height: 40, background: 'var(--g)', color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          {loading ? 'Saving...' : 'Add to garage'}
        </button>
        <button
          onClick={onClose}
          style={{ flex: 1, height: 40, background: 'transparent', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: 10, color: 'var(--mint)', fontSize: 13, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────

export function MyAccountScreen({ onBack }: MyAccountScreenProps) {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const { signOut } = useSignOut()
  const toast = useToast()

  const [tab, setTab] = useState<Tab>('garage')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (!user) return null
  const initials = getUserInitials(user.name)

  async function handleSaveVehicle(vehicleId: string, updates: Partial<Vehicle>) {
    const { error } = await supabase
      .from('vehicles')
      .update({
        plate:     updates.plate,
        nick:      updates.nick,
        charger:   updates.charger,
        port_side: updates.portSide ?? null,
      })
      .eq('id', vehicleId)

    if (error) { toast('Could not save changes. Please try again.'); return }

    setUser({
      ...user,
      vehicles: user.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, ...updates } : v
      ),
    })
    setEditingId(null)
    toast('Vehicle updated ✓')
  }

  async function handleDeleteVehicle(vehicleId: string) {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)

    if (error) { toast('Could not delete vehicle.'); return }

    setUser({
      ...user,
      vehicles: user.vehicles.filter((v) => v.id !== vehicleId),
      selectedVehicleId: user.selectedVehicleId === vehicleId
        ? user.vehicles.find((v) => v.id !== vehicleId)?.id ?? null
        : user.selectedVehicleId,
    })
    setDeletingId(null)
    toast('Vehicle removed from your garage')
  }

  async function handleSetDefault(vehicleId: string) {
    await supabase.from('vehicles').update({ is_default: false }).eq('user_id', user.id)
    await supabase.from('vehicles').update({ is_default: true }).eq('id', vehicleId)
    setUser({
      ...user,
      vehicles: user.vehicles.map((v) => ({ ...v, isDefault: v.id === vehicleId })),
      selectedVehicleId: vehicleId,
    })
    toast('Default vehicle updated ✓')
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--mint)', fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0, fontFamily: '"DM Sans", sans-serif' }}
      >
        ← Back
      </button>

      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--gc)', border: '2px solid var(--gb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--g)',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--cream)' }}>{user.name}</div>
          <div style={{ fontSize: 12, color: 'var(--mint)' }}>{user.phone}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['garage', '🚗 My Garage'], ['account', '👤 Account']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1, height: 38,
              background: tab === id ? 'var(--gl)' : 'var(--bg3)',
              border: `1.5px solid ${tab === id ? 'var(--g)' : 'rgba(29,158,117,0.2)'}`,
              borderRadius: 10, cursor: 'pointer',
              fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700,
              color: tab === id ? 'var(--teal)' : 'var(--mint)',
              transition: 'all 0.2s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── MY GARAGE TAB ── */}
      {tab === 'garage' && (
        <>
          {user.vehicles.length === 0 && !showAddForm && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--mint)', fontSize: 13 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🚗</div>
              <div style={{ marginBottom: 16 }}>No vehicles yet. Add your first car to join the queue.</div>
            </div>
          )}

          {/* Vehicle cards */}
          {user.vehicles.map((v) => {
            const chargerInfo = CHARGER_INFO[v.charger]
            const portLabel = PORT_OPTIONS.find((p) => p.id === v.portSide)

            if (editingId === v.id) {
              return (
                <EditVehicleForm
                  key={v.id}
                  vehicle={v}
                  onSave={(updates) => handleSaveVehicle(v.id, updates)}
                  onCancel={() => setEditingId(null)}
                />
              )
            }

            return (
              <div
                key={v.id}
                style={{
                  background: 'var(--surf)', border: `0.5px solid ${v.isDefault ? 'var(--g)' : 'rgba(29,158,117,0.18)'}`,
                  borderRadius: 14, padding: 14, marginBottom: 10,
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {v.isDefault && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.4), transparent)' }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'var(--gc)', border: '0.5px solid var(--gb)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}>
                    {chargerInfo?.icon ?? '⚡'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--cream)', letterSpacing: '0.06em' }}>
                      {v.plate}
                    </div>
                    {v.nick !== v.plate && <div style={{ fontSize: 12, color: 'var(--mint)' }}>{v.nick}</div>}
                  </div>
                  {v.isDefault && (
                    <span style={{ fontSize: 10, color: 'var(--g)', background: 'var(--gc)', border: '0.5px solid var(--gb)', borderRadius: 20, padding: '2px 8px' }}>
                      Default
                    </span>
                  )}
                </div>

                {/* Details */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, background: 'var(--gc)', border: '0.5px solid var(--gb)', borderRadius: 6, padding: '3px 9px', color: 'var(--teal)' }}>
                    {chargerInfo?.name ?? v.charger}
                  </span>
                  {portLabel ? (
                    <span style={{ fontSize: 11, background: 'var(--gc)', border: '0.5px solid var(--gb)', borderRadius: 6, padding: '3px 9px', color: 'var(--mint)' }}>
                      {portLabel.icon} {portLabel.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, background: 'var(--al)', border: '0.5px solid var(--ab)', borderRadius: 6, padding: '3px 9px', color: 'var(--amber-t)' }}>
                      ⚠ Port not set
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                {deletingId === v.id ? (
                  <div style={{ background: 'var(--rl)', border: '0.5px solid var(--rb)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, color: '#F7C1C1', marginBottom: 10 }}>
                      Remove <strong>{v.plate}</strong> from your garage?
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleDeleteVehicle(v.id)}
                        style={{ flex: 1, height: 36, background: 'var(--r)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
                      >
                        Yes, remove
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        style={{ flex: 1, height: 36, background: 'transparent', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setEditingId(v.id)}
                      style={{ flex: 1, height: 34, background: 'var(--gc)', border: '0.5px solid var(--gb)', borderRadius: 8, color: 'var(--teal)', fontSize: 12, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
                    >
                      ✏️ Edit
                    </button>
                    {!v.isDefault && (
                      <button
                        onClick={() => handleSetDefault(v.id)}
                        style={{ flex: 1, height: 34, background: 'var(--gc)', border: '0.5px solid var(--gb)', borderRadius: 8, color: 'var(--mint)', fontSize: 12, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
                      >
                        ★ Set default
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingId(v.id)}
                      style={{ width: 34, height: 34, background: 'var(--rl)', border: '0.5px solid var(--rb)', borderRadius: 8, color: '#F7C1C1', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add vehicle form or button */}
          {showAddForm ? (
            <AddVehicleForm onClose={() => setShowAddForm(false)} />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                width: '100%', height: 44,
                background: 'var(--bg3)',
                border: '1px dashed rgba(29,158,117,0.3)',
                borderRadius: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: '"DM Sans", sans-serif', fontSize: 13, color: 'var(--mint)',
                transition: 'all 0.2s', marginBottom: 16,
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--g)'; e.currentTarget.style.background = 'var(--gc)' }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(29,158,117,0.3)'; e.currentTarget.style.background = 'var(--bg3)' }}
            >
              ➕ Add another vehicle
            </button>
          )}
        </>
      )}

      {/* ── ACCOUNT TAB ── */}
      {tab === 'account' && (
        <>
          <div className="cq-card">
            <div className="section-label">Account details</div>
            {[
              { label: 'Name', value: user.name },
              { label: 'Mobile', value: user.phone },
              { label: 'Member since', value: user.since },
              { label: 'Queue sessions', value: String(user.sessions) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '0.5px solid rgba(29,158,117,0.1)', fontSize: 13 }}>
                <span style={{ color: 'var(--mint)' }}>{label}</span>
                <span style={{ fontWeight: 500, color: 'var(--cream)', fontSize: 12 }}>{value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={signOut}
            style={{
              width: '100%', height: 44, background: 'transparent',
              border: '0.5px solid var(--rb)', borderRadius: 'var(--rads)',
              color: '#F7C1C1', fontFamily: '"DM Sans", sans-serif',
              fontSize: 13, cursor: 'pointer', marginTop: 4, transition: 'background 0.2s',
            }}
            onMouseOver={(e) => { (e.target as HTMLElement).style.background = 'var(--rl)' }}
            onMouseOut={(e) => { (e.target as HTMLElement).style.background = 'transparent' }}
          >
            Sign out
          </button>
          <div style={{ height: 8 }} />
        </>
      )}
    </div>
  )
}
