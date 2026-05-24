import { useAppStore } from '@/store/appStore'

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts)
  const dismiss = useAppStore((s) => s.dismissToast)

  if (!toasts.length) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'max(100px, calc(100px + env(safe-area-inset-bottom, 0px)))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          style={{
            background: 'var(--surf2)',
            border: '0.5px solid rgba(29,158,117,0.3)',
            borderRadius: '20px',
            padding: '10px 20px',
            fontSize: '13px',
            color: 'var(--cream)',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            animation: 'fadeIn 0.2s ease',
            maxWidth: '380px',
            textAlign: 'center',
            pointerEvents: 'all',
            cursor: 'pointer',
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
