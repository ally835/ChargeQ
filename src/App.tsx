import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { AuthInitializer } from '@/components/auth/AuthInitializer'
import { SiteInitializer } from '@/components/auth/SiteInitializer'
import { useAppStore } from '@/store/appStore'

// Pages
import QueuePage from '@/pages/QueuePage'
import FinderPage from '@/pages/FinderPage'
import HelpPage from '@/pages/HelpPage'
import LandingPage from '@/pages/LandingPage'
import AdminQueuePage from '@/pages/AdminQueuePage'
import AdminBaysPage from '@/pages/AdminBaysPage'
import AdminReportsPage from '@/pages/AdminReportsPage'
import AdminSettingsPage from '@/pages/AdminSettingsPage'
import AdminApprovalsPage from '@/pages/AdminApprovalsPage'
import AdminAdsPage from '@/pages/AdminAdsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

function AdminGuard({ children }: { children: React.ReactNode }) {
  const appMode = useAppStore((s) => s.appMode)
  if (appMode !== 'admin' && appMode !== 'superadmin') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Hidden landing page — no AppShell, no nav */}
      <Route path="/landing" element={<LandingPage />} />

      {/* All other routes inside AppShell */}
      <Route path="/*" element={
        <AppShell>
          <Routes>
            <Route path="/" element={<QueuePage />} />
            <Route path="/finder" element={<FinderPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/admin/queue"     element={<AdminGuard><AdminQueuePage /></AdminGuard>} />
            <Route path="/admin/bays"      element={<AdminGuard><AdminBaysPage /></AdminGuard>} />
            <Route path="/admin/reports"   element={<AdminGuard><AdminReportsPage /></AdminGuard>} />
            <Route path="/admin/ads"       element={<AdminGuard><AdminAdsPage /></AdminGuard>} />
            <Route path="/admin/approvals" element={<AdminGuard><AdminApprovalsPage /></AdminGuard>} />
            <Route path="/admin/settings"  element={<AdminGuard><AdminSettingsPage /></AdminGuard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer />
        <SiteInitializer />
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
