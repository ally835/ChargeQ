import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { CHARGER_INFO } from '@/utils'
import { PortSelector } from './PortSelector'
import type { ChargerType, PortSide } from '@/types'

interface PortOnlyPickerProps {
  vehicleId: string
  vehiclePlate: string
  charger: ChargerType
  onConfirm: (portSide: PortSide) => void
}

export function PortOnlyPicker({ vehicleId, vehiclePlate, charger, onConfirm }: PortOnlyPickerProps) {
  const [selected, setSelected] = useState<PortSide | ''>('')
  const [saving, setSaving] = useState(false)
  const [hasError, setHasError] = useState(false)
  const chargerInfo = CHARGER_INFO[charger]

  async function handleConfirm() {
    if (!selected) { setHasError(true); return }
    setSaving(true)

    if (!vehicleId.startsWith('temp_')) {
      await supabase
        .from('vehicles')
        .update({ port_side: selected })
        .eq('id', vehicleId)

      const { refreshUser } = useAuthStore.getState()
      await refreshUser()
    }

    setSaving(false)
    onConfirm(selected as PortSide)
  }

  return (
    <div style={{ padding: '20px 16px', animation: 'slideUp 0.3s cubic-bezier(0.2,0.8,0.3,1)' }}>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 56, height: 56, background: 'var(--gc)', border: '1.5px solid var(--gb)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px', fontSize: 28,
        }}>
          {chargerInfo?.icon ?? '⚡'}
        </div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--cream)', marginBottom: 6 }}>
          One quick thing
        </div>
        <div style={{ fontSize: 13, color: 'var(--mint)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
          Where is the charging port on <strong style={{ color: 'var(--cream)' }}>{vehiclePlate}</strong>?
        </div>
        <div style={{ display: 'inline-block', marginTop: 8, background: 'var(--gc)', border: '0.5px solid var(--gb)', borderRadius: 20, padding: '4px 14px', fontSize: 11, color: 'var(--teal)' }}>
          {chargerInfo?.name ?? charger}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <PortSelector value={selected} onChange={(p) => { setSelected(p); setHasError(false) }} hasError={hasError} />
      </div>

      <div style={{ background: 'var(--gc)', border: '0.5px solid var(--gb)', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: 'var(--mint)', marginBottom: 16, lineHeight: 1.6, textAlign: 'center' }}>
        💾 We'll remember this so you never need to enter it again
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selected || saving}
        style={{
          width: '100%', height: 56,
          background: selected ? 'var(--g)' : 'rgba(29,158,117,0.3)',
          color: '#fff', border: 'none', borderRadius: 14,
          fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800,
          cursor: selected ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          transition: 'all 0.2s',
          boxShadow: selected ? '0 4px 20px rgba(29,158,117,0.35)' : 'none',
        }}
      >
        {saving
          ? <><span className="cq-spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff' }} /> Saving & joining...</>
          : <>Join the queue ⚡</>
        }
      </button>
    </div>
  )
}
