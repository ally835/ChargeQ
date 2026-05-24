import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { TopBar } from './TopBar'
import { NavTabs } from './NavTabs'
import { ToastContainer } from '@/components/ui/ToastContainer'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  // Finder needs full height without scroll — map requires a fixed-height container
  const isFinder = location.pathname === '/finder'

  return (
    <div className="cq-app">
      <TopBar />
      <NavTabs />
      <main
        style={
          isFinder
            ? { flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }
            : { flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', WebkitOverflowScrolling: 'touch' as const }
        }
      >
        {children}
      </main>
      <ToastContainer />
    </div>
  )
}
