import { useState } from 'react'

type StaffType = 'manager' | 'admin'

interface AdminHubModalProps {
  onClose: () => void
  onSelectType: (type: StaffType) => void
  onRegister: () => void
}

export function AdminHubModal({ onClose, onSelectType, onRegister }: AdminHubModalProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        zIndex: 800, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg2)', border: '0.5px solid rgba(239,159,39,0.25)',
          borderTop: '2px solid var(--a)', borderRadius: '20px 20px 0 0',
          padding: '20px 20px max(24px, env(safe-area-inset-bottom, 24px))',
          width: '100%', maxWidth: 480,
          animation: 'slideSheet 0.3s cubic-bezier(0.2,0.8,0.3,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          width: 36, height: 4, background: 'rgba(255,255,255,0.15)',
          borderRadius: 2, margin: '0 auto 16px',
        }} />

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700,
            color: 'var(--amber-t)', marginBottom: 4,
          }}>ChargeQ Administration</div>
          <div style={{ fontSize: 12, color: 'var(--mint)' }}>
            Select your access level to continue
          </div>
        </div>

        <button
          onClick={() => onSelectType('manager')}
          style={{
            width: '100%', padding: '14px 16px', marginBottom: 10,
            background: 'var(--al)', border: '0.5px solid var(--ab)',
            borderRadius: 'var(--rads)', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <div style={{ fontSize: 24 }}>🏢</div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--amber-t)', marginBottom: 2 }}>
              Site Manager
            </div>
            <div style={{ fontSize: 11, color: 'rgba(239,159,39,0.6)' }}>
              Manage your site's queue and bays
            </div>
          </div>
        </button>

        <button
          onClick={() => onSelectType('admin')}
          style={{
            width: '100%', padding: '14px 16px', marginBottom: 16,
            background: 'rgba(55,138,221,0.1)', border: '0.5px solid rgba(55,138,221,0.3)',
            borderRadius: 'var(--rads)', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <div style={{ fontSize: 24 }}>⬡</div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#85B7EB', marginBottom: 2 }}>
              ChargeQ Super Admin
            </div>
            <div style={{ fontSize: 11, color: 'rgba(55,138,221,0.5)' }}>
              System administration
            </div>
          </div>
        </button>

        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <button
            onClick={onRegister}
            style={{
              background: 'none', border: 'none', fontSize: 12,
              color: 'var(--teal)', cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            New site manager? Request access →
          </button>
        </div>

        <button className="btn-secondary" onClick={onClose} style={{ height: 40, fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
