import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { AdminPinOverlay } from '@/components/admin/AdminPinOverlay'
import { SiteManagerLoginOverlay } from '@/components/admin/SiteManagerLoginOverlay'
import { useSuperAdminLogin } from '@/hooks/useAdmin'

type AdminFlow = 'none' | 'hub' | 'superadmin-pin' | 'manager-login'

export default function HelpPage() {
  const siteInfo = useAppStore((s) => s.siteInfo)
  const appMode = useAppStore((s) => s.appMode)
  const navigate = useNavigate()
  const [flow, setFlow] = useState<AdminFlow>('none')

  const { verifySuperAdminPin, loading: saLoading, error: saError, clearError: clearSaError } = useSuperAdminLogin()

  async function handleSAPin(pin: string) {
    const ok = await verifySuperAdminPin(pin)
    if (ok) {
      setFlow('none')
      navigate('/admin/queue')
    }
  }

  if (appMode === 'admin' || appMode === 'superadmin') {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--mint)', marginBottom: 12 }}>
          You are in admin mode.
        </div>
        <button
          onClick={() => navigate('/admin/queue')}
          className="btn-primary"
          style={{ maxWidth: 280, margin: '0 auto' }}
        >
          Go to Admin Panel →
        </button>
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: 16 }}>
        {/* Site card */}
        <div style={{ background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)', borderRadius: 'var(--rad)', padding: 14, marginBottom: 10, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.3), transparent)' }} />
          <div style={{
            width: 48, height: 48, background: 'var(--g)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13Z"/></svg>
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--cream)', marginBottom: 3 }}>ChargeQ</div>
          <div style={{ fontSize: 11, color: 'var(--mint)' }}>EV Charging Virtual Queue</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{siteInfo.name}</div>
        </div>

        {/* How it works */}
        <div style={{ background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)', borderRadius: 'var(--rad)', padding: 14, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.3), transparent)' }} />
          <div className="section-label">How it works</div>
          {[
            { icon: '📱', title: 'Scan & register', text: 'Scan the QR code at your bay, enter your details, and join the digital queue in under 60 seconds.' },
            { icon: '⚡', title: 'Wait anywhere', text: "Your position is held while you grab a coffee or explore. No need to hover by your car." },
            { icon: '✔', title: 'SMS when ready', text: 'The moment your bay is free, we send you a text. You have 5 minutes to proceed.' },
            { icon: '📍', title: 'Find a nearby station', text: 'Tap Find Bay to see nearby stations with live wait times and estimated drive times.' },
          ].map(({ icon, title, text }) => (
            <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 20, flexShrink: 0, width: 28, textAlign: 'center' }}>{icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cream)', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--mint)', lineHeight: 1.5 }}>{text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* This location */}
        <div style={{ background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)', borderRadius: 'var(--rad)', padding: 14, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.3), transparent)' }} />
          <div className="section-label">This location</div>
          {[
            { label: 'Site', value: siteInfo.name },
            { label: 'Address', value: siteInfo.addr },
            { label: 'Charger types', value: 'CCS2, Type 2, CHAdeMO, Tesla' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid rgba(29,158,117,0.1)', fontSize: 13 }}>
              <span style={{ color: 'var(--mint)' }}>{label}</span>
              <span style={{ fontWeight: 500, color: 'var(--cream)', fontSize: 12, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13 }}>
            <span style={{ color: 'var(--mint)' }}>Support</span>
            <a href="mailto:hello@chargeq.com.au" style={{ color: 'var(--g)', fontSize: 12, textDecoration: 'none' }}>hello@chargeq.com.au</a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>© 2026 ChargeQ • Patent application filed</div>
          <a href="https://chargeq.com.au" style={{ fontSize: 11, color: 'var(--g)' }}>chargeq.com.au</a>
        </div>

        {/* Admin entry */}
        <div style={{ textAlign: 'center', padding: '4px 0 16px' }}>
          <button
            onClick={() => setFlow('hub')}
            style={{
              background: 'none', border: 'none', color: 'var(--text3)',
              fontSize: 11, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
              padding: '8px 16px', borderRadius: 6, transition: 'color 0.2s',
            }}
            onMouseOver={(e) => { (e.target as HTMLElement).style.color = 'var(--mint)' }}
            onMouseOut={(e) => { (e.target as HTMLElement).style.color = 'var(--text3)' }}
          >
            🔒 Admin login
          </button>
        </div>
      </div>

      {/* Admin hub */}
      {flow === 'hub' && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}
          onClick={() => setFlow('none')}
        >
          <div
            style={{ background: 'var(--bg2)', border: '0.5px solid rgba(239,159,39,0.25)', borderTop: '2px solid var(--a)', borderRadius: '20px 20px 0 0', padding: 'max(20px,20px) 20px max(24px,env(safe-area-inset-bottom,24px))', width: '100%', maxWidth: 480, animation: 'slideSheet 0.3s cubic-bezier(.2,.8,.3,1)', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--amber-t)', marginBottom: 4 }}>ChargeQ Administration</div>
            <div style={{ fontSize: 12, color: 'var(--mint)', marginBottom: 20 }}>Select your access level to continue</div>

            {[
              { icon: '⬡', title: 'ChargeQ Super Admin', sub: 'System administration', action: () => setFlow('superadmin-pin'), blue: true },
              { icon: '🏢', title: 'Site Manager', sub: 'Manage your site\'s queue and bays', action: () => setFlow('manager-login'), blue: false },
            ].map(({ icon, title, sub, action, blue }) => (
              <button key={title} onClick={action} style={{
                width: '100%', padding: '14px 16px', marginBottom: 10,
                background: blue ? 'rgba(55,138,221,0.1)' : 'var(--al)',
                border: `0.5px solid ${blue ? 'rgba(55,138,221,0.3)' : 'var(--ab)'}`,
                borderRadius: 'var(--rads)', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ fontSize: 24 }}>{icon}</div>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: blue ? '#85B7EB' : 'var(--amber-t)', marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 11, color: blue ? 'rgba(55,138,221,0.5)' : 'rgba(239,159,39,0.6)' }}>{sub}</div>
                </div>
              </button>
            ))}
            <button className="btn-secondary" onClick={() => setFlow('none')} style={{ margin: 0 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Super admin PIN */}
      {flow === 'superadmin-pin' && (
        <AdminPinOverlay
          title="ChargeQ Super Admin"
          subtitle="Enter your super admin PIN to access the ChargeQ management console."
          onSuccess={handleSAPin}
          onCancel={() => setFlow('none')}
          loading={saLoading}
          error={saError}
        />
      )}

      {/* Site manager login */}
      {flow === 'manager-login' && (
        <SiteManagerLoginOverlay
          onClose={() => setFlow('none')}
          onRegister={() => setFlow('none')}
        />
      )}
    </>
  )
}
