interface ChargingScreenProps {
  bayNum: number | null
  plate: string
  siteName: string
  loading: boolean
  onDone: () => void
}

export function ChargingScreen({ bayNum, plate, siteName, loading, onDone }: ChargingScreenProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px 24px' }}>
      {/* Pulsing icon */}
      <div style={{
        width: 88, height: 88, borderRadius: '50%',
        background: 'linear-gradient(135deg, #1D9E75, #085041)',
        border: '2px solid rgba(29,158,117,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 40, marginBottom: 20,
        boxShadow: '0 0 0 10px rgba(29,158,117,0.12), 0 0 0 20px rgba(29,158,117,0.06)',
        animation: 'pulseDot 2s ease-in-out infinite',
      }}>
        ⚡
      </div>

      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800,
        color: 'var(--cream)', marginBottom: 4, textAlign: 'center',
      }}>
        Charging in progress
      </h2>
      <p style={{ fontSize: 13, color: 'var(--mint)', marginBottom: 24, textAlign: 'center' }}>
        {siteName}
      </p>

      {/* Bay + plate detail card */}
      <div style={{
        width: '100%', background: 'var(--gc)',
        border: '0.5px solid var(--gb)', borderRadius: 'var(--rad)',
        overflow: 'hidden', marginBottom: 28,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: '18px 16px',
          borderBottom: '0.5px solid var(--gb)',
        }}>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontSize: 40, fontWeight: 800,
            color: 'var(--g)', lineHeight: 1,
          }}>
            {bayNum ?? '—'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--mint)', paddingTop: 4 }}>Bay</span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 16px',
        }}>
          <span style={{ fontSize: 11, color: 'var(--mint)' }}>Plate</span>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
            color: 'var(--cream)', letterSpacing: '0.08em',
          }}>
            {plate}
          </span>
        </div>
      </div>

      {/* Done button */}
      <button
        onClick={onDone}
        disabled={loading}
        style={{
          width: '100%', height: 54,
          background: loading ? 'var(--gc)' : 'var(--g)',
          border: 'none', borderRadius: 'var(--rads)',
          color: '#fff', fontFamily: 'Syne, sans-serif',
          fontSize: 15, fontWeight: 800,
          cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
      >
        {loading ? <span className="cq-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : '✓ I\'m done charging'}
      </button>

      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>
        Tapping done will free the bay for the next driver in queue.
      </p>
    </div>
  )
}
