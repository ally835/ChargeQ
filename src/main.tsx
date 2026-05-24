import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import './index.css'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
    // Don't send errors in dev unless DSN is explicitly set
    enabled: import.meta.env.PROD || !!SENTRY_DSN,
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, padding: 32, textAlign: 'center', background: '#091510' }}>
          <div style={{ fontSize: 32 }}>⚡</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#E8F5F0' }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: '#6FCF97', lineHeight: 1.6 }}>ChargeQ has encountered an unexpected error. Please refresh the page.</div>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 8, padding: '10px 24px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)
