import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useSignOut } from '@/hooks/useAuth'
import { useAppStore, useToast } from '@/store/appStore'
import { getUserInitials, CHARGER_INFO } from '@/utils'
import type { Bay } from '@/types'
import { FeedbackModal } from '@/components/ui/FeedbackModal'

interface WelcomeDashboardProps {
  queueCount: number
  waitMins: number
  bays: Bay[]
  onJoinQueue: () => void        // goes to step flow (charger+port selection)
  onQuickJoin: () => void        // skips straight to RPC join with saved vehicle
  onManageAccount: () => void
  onSelectVehicle: (id: string) => void
}

function BayDot({ bay }: { bay: Bay }) {
  const isFree = bay.status === 'free'
  const isFault = bay.status === 'fault'
  return (
    <div style={{
      borderRadius: 8, padding: '7px 4px', textAlign: 'center',
      fontSize: 9, fontWeight: 500,
      background: isFault ? 'rgba(239,159,39,0.12)' : isFree ? 'var(--gl)' : 'var(--rl)',
      color: isFault ? 'var(--amber-t)' : isFree ? 'var(--mint)' : '#F7C1C1',
      border: `0.5px solid ${isFault ? 'var(--ab)' : isFree ? 'var(--gb)' : 'var(--rb)'}`,
    }}>
      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, display: 'block', marginBottom: 1 }}>
        {bay.num}
      </span>
      {isFault ? '⚠' : isFree ? 'Free' : 'Occ'}
    </div>
  )
}

export function WelcomeDashboard({
  queueCount, waitMins, bays,
  onJoinQueue, onQuickJoin,
  onManageAccount, onSelectVehicle,
}: WelcomeDashboardProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const siteKey = useAppStore((s) => s.siteKey)
  const { signOut } = useSignOut()
  const toast = useToast()
  const [showFeedback, setShowFeedback] = useState(false)

  if (!user) return null

  async function handleShare() {
    const url = window.location.origin
    const text = 'Join me on ChargeQ — the smarter way to queue for EV charging'
    if (navigator.share) {
      try { await navigator.share({ title: 'ChargeQ', text, url }) } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        toast('Link copied to clipboard!')
      } catch {
        toast('Share not supported on this device.')
      }
    }
  }

  const initials = getUserInitials(user.name)
  const selectedVehicle = user.vehicles.find((v) => v.id === user.selectedVehicleId) ?? user.vehicles[0]
  // Can quick-join if vehicle has both charger type and port side saved
  const canQuickJoin = !!(selectedVehicle?.charger && selectedVehicle?.portSide)

  return (
    <div style={{ padding: 16 }}>
      {/* Greeting */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--cream)', lineHeight: 1.2 }}>
          Hey, {user.name.split(' ')[0]} 👋
        </div>
        <div style={{ fontSize: 12, color: 'var(--mint)', marginTop: 3 }}>
          Ready to charge?
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
        {[
          { n: queueCount, l: 'In queue' },
          { n: queueCount === 0 ? '0' : `~${waitMins}`, l: 'Min wait' },
          { n: bays.length || 6, l: 'Total bays' },
        ].map(({ n, l }) => (
          <div key={l} style={{
            background: 'var(--gc)', border: '0.5px solid var(--gb)',
            borderRadius: 'var(--rads)', padding: '10px 8px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--g)', lineHeight: 1, marginBottom: 3 }}>{n}</div>
            <div style={{ fontSize: 10, color: 'var(--mint)' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Bay grid */}
      {bays.length > 0 && (
        <div className="cq-card">
          <div className="section-label">Live bay status</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
            {bays.map((bay) => <BayDot key={bay.num} bay={bay} />)}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 10, color: 'var(--text2)' }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'rgba(226,75,74,0.5)', marginRight: 4 }} />Occupied</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--g)', marginRight: 4 }} />Available</span>
          </div>
        </div>
      )}

      {/* ── PRIMARY CTA — Join the queue ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.05))',
        border: '1px solid rgba(29,158,117,0.3)',
        borderRadius: 'var(--rad)', padding: 16, marginBottom: 10,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.4), transparent)' }} />

        <div style={{ fontSize: 12, color: 'var(--mint)', marginBottom: 4 }}>
          {queueCount === 0 ? '✨ No one waiting — join now!' : `${queueCount} driver${queueCount !== 1 ? 's' : ''} in queue · ~${waitMins} min wait`}
        </div>

        {canQuickJoin && selectedVehicle ? (
          <>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>
              Ready to charge with <span style={{ color: 'var(--teal)' }}>{selectedVehicle.plate}</span>?
            </div>
            <button
              onClick={onQuickJoin}
              style={{
                width: '100%', height: 52,
                background: 'var(--g)', color: '#fff', border: 'none',
                borderRadius: 12,
                fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800,
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 4px 20px rgba(29,158,117,0.35)',
                marginBottom: 8,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13Z" />
              </svg>
              Join the queue now
            </button>
            <button
              onClick={onJoinQueue}
              style={{
                width: '100%', height: 36,
                background: 'transparent', border: '0.5px solid rgba(29,158,117,0.3)',
                borderRadius: 8, color: 'var(--mint)',
                fontFamily: '"DM Sans", sans-serif', fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Use different vehicle or charger type
            </button>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>
              Select your charger type to join
            </div>
            <button
              onClick={onJoinQueue}
              style={{
                width: '100%', height: 52,
                background: 'var(--g)', color: '#fff', border: 'none',
                borderRadius: 12,
                fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800,
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 4px 20px rgba(29,158,117,0.35)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13Z" />
              </svg>
              Join the queue
            </button>
          </>
        )}
      </div>

      {/* Find nearby stations */}
      <button className="btn-secondary" onClick={() => navigate('/finder')} style={{ marginBottom: 8 }}>
        All bays full? Find nearby stations →
      </button>

      {/* Share + Feedback row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button
          onClick={handleShare}
          style={{
            flex: 1, height: 38,
            background: 'transparent', border: '0.5px solid rgba(29,158,117,0.3)',
            borderRadius: 'var(--rads)', color: 'var(--teal)',
            fontFamily: '"DM Sans", sans-serif', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          ↑ Share ChargeQ
        </button>
        <button
          onClick={() => setShowFeedback(true)}
          style={{
            flex: 1, height: 38,
            background: 'transparent', border: '0.5px solid rgba(29,158,117,0.3)',
            borderRadius: 'var(--rads)', color: 'var(--teal)',
            fontFamily: '"DM Sans", sans-serif', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          ★ Leave feedback
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 8px' }}>
        <div style={{ flex: 1, height: '0.5px', background: 'rgba(29,158,117,0.2)' }} />
        <div style={{ fontSize: 10, color: 'var(--teal)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>My Garage</div>
        <div style={{ flex: 1, height: '0.5px', background: 'rgba(29,158,117,0.2)' }} />
      </div>

      <div className="cq-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--gc)', border: '1.5px solid var(--gb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--g)',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--cream)' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: 'var(--mint)' }}>{user.phone}</div>
          </div>
          <button
            onClick={onManageAccount}
            style={{
              background: 'var(--gc)', border: '0.5px solid var(--gb)',
              borderRadius: 8, padding: '5px 10px',
              fontSize: 11, color: 'var(--teal)', cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            My Garage ›
          </button>
        </div>

        {/* Vehicle pills */}
        {user.vehicles.length > 0 && (
          <>
            <div className="section-label" style={{ marginBottom: 8 }}>My Garage</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {user.vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onSelectVehicle(v.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px',
                    background: v.id === user.selectedVehicleId ? 'var(--gl)' : 'var(--gc)',
                    border: `1.5px solid ${v.id === user.selectedVehicleId ? 'var(--g)' : 'rgba(29,158,117,0.2)'}`,
                    borderRadius: 20, cursor: 'pointer',
                    fontFamily: '"DM Sans", sans-serif', fontSize: 12,
                    color: v.id === user.selectedVehicleId ? 'var(--teal)' : 'var(--mint)',
                    transition: 'all 0.2s',
                  }}
                >
                  <span>{CHARGER_INFO[v.charger]?.icon ?? '⚡'}</span>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11 }}>
                    {v.plate}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        style={{
          width: '100%', height: 40,
          background: 'transparent',
          border: '0.5px solid rgba(240,239,232,0.1)',
          borderRadius: 'var(--rads)',
          color: 'var(--text3)',
          fontFamily: '"DM Sans", sans-serif', fontSize: 12,
          cursor: 'pointer', marginTop: 4, marginBottom: 8,
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = 'rgba(240,239,232,0.2)'
          e.currentTarget.style.color = 'var(--text2)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = 'rgba(240,239,232,0.1)'
          e.currentTarget.style.color = 'var(--text3)'
        }}
      >
        Sign out
      </button>

      {showFeedback && (
        <FeedbackModal
          role="driver"
          siteKey={siteKey ?? undefined}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  )
}
