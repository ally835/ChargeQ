interface VehicleChoiceSheetProps {
  onAddToGarage: () => void
  onTempCar: () => void
  onClose: () => void
}

export function VehicleChoiceSheet({ onAddToGarage, onTempCar, onClose }: VehicleChoiceSheetProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        zIndex: 700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg2)',
          border: '0.5px solid rgba(29,158,117,0.25)',
          borderTop: '2px solid var(--g)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(24px, env(safe-area-inset-bottom, 24px))',
          width: '100%', maxWidth: 480,
          animation: 'slideSheet 0.3s cubic-bezier(0.2,0.8,0.3,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />

        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 4 }}>
          Different car today?
        </div>
        <div style={{ fontSize: 12, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 20 }}>
          Is this car going into your garage or is it a one-off?
        </div>

        <button
          onClick={onAddToGarage}
          style={{
            width: '100%', padding: '14px 16px', marginBottom: 10,
            background: 'var(--gl)', border: '1.5px solid var(--gb)',
            borderRadius: 'var(--rads)', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          <div style={{ fontSize: 28, flexShrink: 0 }}>🏠</div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--teal)', marginBottom: 3 }}>
              Add to My Garage
            </div>
            <div style={{ fontSize: 12, color: 'var(--mint)', lineHeight: 1.4 }}>
              Save this car to your account for future visits
            </div>
          </div>
        </button>

        <button
          onClick={onTempCar}
          style={{
            width: '100%', padding: '14px 16px', marginBottom: 16,
            background: 'var(--al)', border: '1.5px solid var(--ab)',
            borderRadius: 'var(--rads)', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          <div style={{ fontSize: 28, flexShrink: 0 }}>🔄</div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--amber-t)', marginBottom: 3 }}>
              Temporary car
            </div>
            <div style={{ fontSize: 12, color: 'rgba(239,159,39,0.7)', lineHeight: 1.4 }}>
              Hire car, friend's car or a one-off — not saved to your account
            </div>
          </div>
        </button>

        <button onClick={onClose} className="btn-secondary" style={{ margin: 0 }}>Cancel</button>
      </div>
    </div>
  )
}
