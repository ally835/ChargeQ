// WaitRing — exact V2 geometry preserved
// r = 54, circumference = 2π×54 ≈ 339.3
// strokeDashoffset maps position → progress around ring:
//   pos 1 of 1 → offset ≈ 25 (nearly full)
//   pos 3 of 4 → offset ≈ 169 (half)
//   pos 6+ → offset ≈ 310 (nearly empty)

const CIRC = 339

function positionToOffset(position: number, totalInQueue: number): number {
  if (position <= 1) return 25
  const progress = Math.max(0, Math.min(1, (totalInQueue - position) / Math.max(totalInQueue - 1, 1)))
  return Math.round(CIRC * (1 - progress))
}

interface WaitRingProps {
  position: number
  totalInQueue: number
  estimatedWaitMins: number
}

export function WaitRing({ position, totalInQueue, estimatedWaitMins }: WaitRingProps) {
  const offset = positionToOffset(position, totalInQueue)

  return (
    <div style={{
      width: 130, height: 130,
      margin: '8px auto 12px',
      position: 'relative',
    }}>
      <svg
        width="130"
        height="130"
        viewBox="0 0 130 130"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx="65" cy="65" r="54"
          fill="none"
          stroke="rgba(29,158,117,0.12)"
          strokeWidth="10"
        />
        {/* Progress arc */}
        <circle
          cx="65" cy="65" r="54"
          fill="none"
          stroke="#1D9E75"
          strokeWidth="10"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      {/* Inner label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: 30, fontWeight: 700,
          color: 'var(--cream)', lineHeight: 1,
        }}>
          {estimatedWaitMins}
        </div>
        <div style={{ fontSize: 11, color: 'var(--mint)', marginTop: 2 }}>min est.</div>
      </div>
    </div>
  )
}
