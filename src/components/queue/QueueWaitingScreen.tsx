import { useState } from 'react'
import { useQueueStore } from '@/store/queueStore'
import { useAuthStore } from '@/store/authStore'
import { useLeaveQueue } from '@/hooks/useQueue'
import { CHARGER_INFO } from '@/utils'
import { WaitRing } from './WaitRing'
import { ArrivalBanner } from './ArrivalBanner'
import { LeaveConfirmModal } from './LeaveConfirmModal'
import { BayTakenModal } from './BayTakenModal'
import { FaultReportModal } from './FaultReportModal'
import type { Bay } from '@/types'

interface QueueWaitingScreenProps {
  onLeft: () => void
  onConfirmedArrival: () => void
}

function BayCell({ bay, myBay }: { bay: Bay; myBay: number | null }) {
  const isMe = myBay != null && bay.num === myBay

  const bg = isMe
    ? 'var(--al)'
    : bay.status === 'free'
    ? 'var(--gl)'
    : 'var(--rl)'

  const color = isMe
    ? 'var(--amber-t)'
    : bay.status === 'free'
    ? 'var(--mint)'
    : '#F7C1C1'

  const border = isMe
    ? '1.5px solid var(--a)'
    : bay.status === 'free'
    ? '0.5px solid var(--gb)'
    : '0.5px solid var(--rb)'

  return (
    <div style={{ borderRadius: 8, padding: '7px 4px', textAlign: 'center', background: bg, border, fontSize: 9, fontWeight: 500, color, transition: 'all 0.3s' }}>
      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, display: 'block', marginBottom: 1 }}>
        {bay.num}
      </span>
      {bay.type}
      <br />
      {isMe ? 'YOU' : bay.status === 'free' ? 'Free' : 'Busy'}
    </div>
  )
}

export function QueueWaitingScreen({ onLeft, onConfirmedArrival }: QueueWaitingScreenProps) {
  const myEntry = useQueueStore((s) => s.myEntry)
  const adminQueue = useQueueStore((s) => s.adminQueue)
  const bays = useQueueStore((s) => s.bays)
  const user = useAuthStore((s) => s.user)
  const { leaveQueue, loading: leaveLoading } = useLeaveQueue()

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showBayTaken, setShowBayTaken] = useState(false)
  const [showFaultReport, setShowFaultReport] = useState(false)

  if (!myEntry) return null

  const isReady = myEntry.status === 'ready'
  const phone = user?.phone ?? ''

  async function handleLeaveConfirm() {
    const ok = await leaveQueue()
    if (ok) {
      setShowLeaveConfirm(false)
      onLeft()
    }
  }

  async function handleBayTakenReported() {
    setShowBayTaken(false)
    // After reporting, the server moves user to position 1 — Realtime will update
  }

  // ── Ready state ───────────────────────────────────────────────────
  if (isReady) {
    return (
      <>
        <ArrivalBanner
          bayNum={myEntry.bayNum}
          onConfirm={onConfirmedArrival}
          onSkip={async () => {
            await leaveQueue()
            onLeft()
          }}
        />

        {/* Bay map while ready */}
        <div style={{ padding: '0 16px 16px' }}>
          <div className="cq-card">
            <div className="section-label">Live bay map</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {bays.map((b) => <BayCell key={b.num} bay={b} myBay={myEntry.bayNum} />)}
            </div>
          </div>

          {myEntry.bayNum != null && (
            <button
              onClick={() => setShowBayTaken(true)}
              style={{
                width: '100%', height: 44,
                background: 'var(--rl)', border: '1.5px solid var(--rb)',
                borderRadius: 'var(--rads)', color: '#F7C1C1',
                fontFamily: '"DM Sans", sans-serif', fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                marginBottom: 8,
              }}
            >
              🚫 Someone took my bay
            </button>
          )}
        </div>

        {showBayTaken && (
          <BayTakenModal
            assignedBay={myEntry.bayNum}
            onClose={() => setShowBayTaken(false)}
            onReported={handleBayTakenReported}
          />
        )}
      </>
    )
  }

  // ── Waiting state ─────────────────────────────────────────────────
  const totalInQueue = adminQueue.length || myEntry.position

  return (
    <>
      {/* Position hero */}
      <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: 72, fontWeight: 800,
          color: 'var(--g)', lineHeight: 1,
          textShadow: '0 0 40px rgba(29,158,117,0.4)',
        }}>
          {myEntry.position}
        </div>
        <div style={{ fontSize: 12, color: 'var(--mint)', marginTop: 4 }}>
          position in queue
        </div>
      </div>

      {/* Wait ring */}
      <WaitRing
        position={myEntry.position}
        totalInQueue={totalInQueue}
        estimatedWaitMins={myEntry.estimatedWaitMins}
      />

      <div style={{ padding: '0 16px 16px' }}>
        {/* SMS notification bar */}
        <div style={{
          background: 'var(--al)', border: '0.5px solid var(--ab)',
          borderRadius: 'var(--rads)', padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 9,
          fontSize: 12, color: 'var(--amber-t)', marginBottom: 10,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>📱</span>
          <span>
            We'll text <strong>{phone || 'you'}</strong> the moment your bay is ready.
          </span>
        </div>

        {/* ── Sponsored ad banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,159,39,0.12), rgba(239,159,39,0.06))',
          border: '0.5px solid rgba(239,159,39,0.3)',
          borderRadius: 'var(--rad)', marginBottom: 10, overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Sponsored label */}
          <div style={{
            position: 'absolute', top: 6, right: 8,
            fontSize: 9, color: 'rgba(250,199,117,0.5)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>Sponsored</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
            {/* Brand icon */}
            <div style={{
              width: 52, height: 52, borderRadius: 12, flexShrink: 0,
              background: 'rgba(239,159,39,0.15)',
              border: '1px solid rgba(239,159,39,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26,
            }}>🍩</div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
                color: 'var(--cream)', marginBottom: 2,
              }}>
                Krispy Kreme — Ampol Foodary
              </div>
              <div style={{ fontSize: 11, color: 'rgba(250,199,117,0.8)', lineHeight: 1.5, marginBottom: 8 }}>
                Show this ad at the counter and get a <strong style={{ color: '#FAC775' }}>FREE donut</strong> with any purchase while you wait! ⚡
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(239,159,39,0.2)', border: '0.5px solid rgba(239,159,39,0.5)',
                borderRadius: 20, padding: '4px 10px',
                fontSize: 10, fontWeight: 600, color: '#FAC775', letterSpacing: '0.04em',
              }}>
                📍 50m away · Open now
              </div>
            </div>
          </div>

          {/* Redemption code strip */}
          <div style={{
            borderTop: '0.5px solid rgba(239,159,39,0.2)',
            padding: '8px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.15)',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(250,199,117,0.6)' }}>Show code at counter:</span>
            <span style={{
              fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
              color: '#FAC775', letterSpacing: '0.12em',
            }}>CQ-FREE</span>
          </div>
        </div>

        {/* Bay map */}
        {bays.length > 0 && (
          <div className="cq-card">
            <div className="section-label">Live bay map</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {bays.map((b) => <BayCell key={b.num} bay={b} myBay={myEntry.bayNum} />)}
            </div>
          </div>
        )}

        {/* Queue list */}
        {adminQueue.length > 0 && (
          <div className="cq-card">
            <div className="section-label">Queue</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {adminQueue.slice(0, 6).map((entry, i) => {
                const isMe = myEntry && entry.id === myEntry.id
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: isMe ? 'var(--gl)' : 'var(--bg3)',
                      border: `0.5px solid ${isMe ? 'var(--g)' : 'rgba(29,158,117,0.15)'}`,
                      borderRadius: 'var(--rads)', padding: '9px 12px',
                      fontSize: 12, transition: 'all 0.2s',
                    }}
                  >
                    <span style={{
                      fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14,
                      color: 'var(--g)', width: 16,
                    }}>{i + 1}</span>
                    <span style={{ fontWeight: 500, color: 'var(--cream)', flex: 1 }}>
                      {entry.plate}{isMe ? ' (you)' : ''}
                    </span>
                    <span style={{ color: 'var(--mint)', fontSize: 11 }}>
                      ~{(i + 1) * 4} min
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Booking details */}
        <div className="cq-card">
          <div className="section-label">Your booking</div>
          {[
            { label: 'Plate', value: myEntry.plate },
            { label: 'Charger', value: CHARGER_INFO[myEntry.charger]?.name ?? myEntry.charger },
            { label: 'Assigned bay', value: myEntry.bayNum != null ? `Bay ${myEntry.bayNum} (${CHARGER_INFO[myEntry.charger]?.name})` : 'Calculating…' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: '0.5px solid rgba(29,158,117,0.1)',
              fontSize: 13,
            }}>
              <span style={{ color: 'var(--mint)' }}>{label}</span>
              <span style={{ fontWeight: 500, color: 'var(--cream)', textAlign: 'right', maxWidth: '60%', fontSize: 12 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Bay taken button — only shown when bay is assigned */}
        {myEntry.bayNum != null && (
          <button
            onClick={() => setShowBayTaken(true)}
            style={{
              width: '100%', height: 40,
              background: 'transparent', border: '0.5px solid var(--rb)',
              borderRadius: 'var(--rads)', color: 'var(--amber-t)',
              fontFamily: '"DM Sans", sans-serif', fontSize: 12, cursor: 'pointer',
              marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            🚫 Someone took my bay
          </button>
        )}

        {/* Fault report */}
        <button
          onClick={() => setShowFaultReport(true)}
          style={{
            width: '100%', height: 40,
            background: 'transparent', border: '0.5px solid rgba(239,159,39,0.35)',
            borderRadius: 'var(--rads)', color: 'var(--amber-t)',
            fontFamily: '"DM Sans", sans-serif', fontSize: 12, cursor: 'pointer',
            marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          ⚠️ Report a bay problem
        </button>

        {/* Leave */}
        <button
          onClick={() => setShowLeaveConfirm(true)}
          style={{
            width: '100%', height: 44, marginTop: 6,
            background: 'transparent',
            border: '0.5px solid rgba(240,239,232,0.12)',
            borderRadius: 'var(--rads)',
            color: 'var(--text3)',
            fontFamily: '"DM Sans", sans-serif', fontSize: 12,
            cursor: 'pointer', letterSpacing: '0.03em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = 'rgba(226,75,74,0.3)'
            e.currentTarget.style.color = 'rgba(247,193,193,0.7)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'rgba(240,239,232,0.12)'
            e.currentTarget.style.color = 'var(--text3)'
          }}
        >
          Leave waitlist
        </button>
      </div>

      {/* Modals */}
      {showLeaveConfirm && (
        <LeaveConfirmModal
          position={myEntry.position}
          onConfirm={handleLeaveConfirm}
          onCancel={() => setShowLeaveConfirm(false)}
          loading={leaveLoading}
        />
      )}
      {showBayTaken && (
        <BayTakenModal
          assignedBay={myEntry.bayNum}
          onClose={() => setShowBayTaken(false)}
          onReported={handleBayTakenReported}
        />
      )}
      {showFaultReport && (
        <FaultReportModal
          defaultBayNum={myEntry.bayNum}
          onClose={() => setShowFaultReport(false)}
        />
      )}
    </>
  )
}
