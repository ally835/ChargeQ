interface LeaveConfirmModalProps {
  position: number
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function LeaveConfirmModal({ position, onConfirm, onCancel, loading }: LeaveConfirmModalProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        zIndex: 700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--bg2)', border: '0.5px solid rgba(29,158,117,0.2)',
          borderRadius: '20px 20px 0 0',
          padding: 'max(20px, 20px) 20px max(24px, env(safe-area-inset-bottom, 24px))',
          width: '100%', maxWidth: 480, textAlign: 'center',
          animation: 'slideSheet 0.3s cubic-bezier(0.2,0.8,0.3,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          width: 36, height: 4, background: 'rgba(255,255,255,0.15)',
          borderRadius: 2, margin: '0 auto 16px',
        }} />

        <div style={{ fontSize: 40, marginBottom: 12 }}>😊</div>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700,
          color: 'var(--cream)', marginBottom: 8,
        }}>Leave the waitlist?</div>
        <div style={{ fontSize: 13, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 20 }}>
          Your spot will be released and the next driver in line will move up.
        </div>

        <div style={{
          display: 'inline-block',
          background: 'var(--gl)', border: '0.5px solid var(--gb)',
          borderRadius: 20, padding: '4px 16px',
          fontFamily: 'Syne, sans-serif', fontSize: 13, color: 'var(--teal)',
          marginBottom: 20,
        }}>
          You are currently #{position} in queue
        </div>

        <button
          onClick={onConfirm}
          disabled={loading}
          style={{
            width: '100%', height: 44, marginBottom: 10,
            background: 'transparent', border: '0.5px solid var(--rb)',
            borderRadius: 'var(--rads)', color: '#F7C1C1',
            fontFamily: '"DM Sans", sans-serif', fontSize: 13, cursor: 'pointer',
          }}
        >
          {loading ? 'Leaving...' : 'Yes, leave the waitlist'}
        </button>
        <button onClick={onCancel} className="btn-secondary" style={{ margin: 0 }}>
          No, keep my spot
        </button>
      </div>
    </div>
  )
}
