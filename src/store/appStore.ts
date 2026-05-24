import { create } from 'zustand'
import type { AppMode, SiteInfo } from '@/types'

// ── Predefined ChargeQ sites — mirrors V2 SITES dict ─────────────────

export const SITES: Record<string, SiteInfo> = {
  'westfield-bay-a': { key: 'westfield-bay-a', name: 'Westfield Bay A', addr: 'Pitt Street Mall, Sydney' },
  'westfield-bay-b': { key: 'westfield-bay-b', name: 'Westfield Bay B', addr: 'Pitt Street Mall, Sydney' },
  'ikea-tempe':      { key: 'ikea-tempe',       name: 'IKEA Tempe',      addr: '634 Princes Hwy, Tempe NSW' },
  'chatswood-chase': { key: 'chatswood-chase',  name: 'Chatswood Chase', addr: '345 Victoria Ave, Chatswood NSW' },
  'demo':            { key: 'demo',             name: 'Demo Site',       addr: 'ChargeQ Demo Mode' },
}

function resolveSite(key: string): SiteInfo {
  return SITES[key] ?? {
    key,
    name: decodeURIComponent(key).replace(/-/g, ' '),
    addr: 'Charging site',
  }
}

// ── Toast ─────────────────────────────────────────────────────────────

interface Toast {
  id: string
  message: string
}

// ── App Store ─────────────────────────────────────────────────────────

interface AppState {
  // Site context (set from ?site= URL param)
  siteKey: string
  siteInfo: SiteInfo
  siteStatus: 'resolving' | 'valid' | 'invalid'
  setSite: (key: string) => void
  setSiteStatus: (status: 'resolving' | 'valid' | 'invalid') => void
  setSiteInfo: (info: SiteInfo) => void

  // App mode — drives nav visibility
  appMode: AppMode
  setAppMode: (mode: AppMode) => void

  // Admin session (site manager info, not the super admin PIN)
  adminSessionManagerId: string | null
  setAdminSessionManagerId: (id: string | null) => void

  // Toast queue
  toasts: Toast[]
  showToast: (message: string) => void
  dismissToast: (id: string) => void
}

let _toastId = 0

export const useAppStore = create<AppState>()((set) => {
  const urlParams = new URLSearchParams(window.location.search)
  const initialSiteKey = urlParams.get('site') ?? import.meta.env.VITE_DEFAULT_SITE_KEY ?? 'demo'

  return {
    siteKey: initialSiteKey,
    siteInfo: resolveSite(initialSiteKey),
    // Known sites are immediately valid; unknown slugs need server validation
    siteStatus: (initialSiteKey in SITES) ? 'valid' : 'resolving',
    setSite: (key) => set({ siteKey: key, siteInfo: resolveSite(key), siteStatus: (key in SITES) ? 'valid' : 'resolving' }),
    setSiteStatus: (siteStatus) => set({ siteStatus }),
    setSiteInfo: (siteInfo) => set({ siteInfo, siteStatus: 'valid' }),

    appMode: 'user',
    setAppMode: (appMode) => set({ appMode }),

    adminSessionManagerId: null,
    setAdminSessionManagerId: (id) => set({ adminSessionManagerId: id }),

    toasts: [],
    showToast: (message) => {
      const id = String(++_toastId)
      set((state) => ({ toasts: [...state.toasts, { id, message }] }))
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, 3200)
    },
    dismissToast: (id) => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    },
  }
})

// ── Convenience hook ──────────────────────────────────────────────────

export const useToast = () => useAppStore((s) => s.showToast)
