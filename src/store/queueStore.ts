import { create } from 'zustand'
import type { MyQueueEntry, Bay, QueueEntry } from '@/types'

// ── Queue Store ───────────────────────────────────────────────────────
//
// SECURITY: This store is READ-ONLY from the client perspective.
// All writes go through Supabase RPC functions.
// Queue state is hydrated via:
//   1. Initial fetch on site load
//   2. Supabase Realtime subscription to queue_entries + bays tables
//
// The "myEntry" is the canonical queue entry for the current user.
// Position and estimatedWaitMins come from the SERVER — never computed client-side.

interface QueueState {
  // Current user's queue entry (null if not in queue)
  myEntry: MyQueueEntry | null

  // Full queue visible to admin
  adminQueue: QueueEntry[]

  // Bay state for current site
  bays: Bay[]

  // Realtime connection status
  isRealtimeConnected: boolean
  realtimeStatus: 'connecting' | 'connected' | 'error' | 'timeout'

  // Actions (mutations go through hooks/API layer, not directly here)
  setMyEntry: (entry: MyQueueEntry | null) => void
  setAdminQueue: (queue: QueueEntry[]) => void
  setBays: (bays: Bay[]) => void
  setRealtimeConnected: (connected: boolean) => void
  setRealtimeStatus: (status: 'connecting' | 'connected' | 'error' | 'timeout') => void

  // Optimistic update for position when realtime event arrives
  updateMyPosition: (position: number, estimatedWaitMins: number) => void
  updateMyStatus: (status: MyQueueEntry['status'], bayNum?: number) => void

  // Clear on sign-out or leave
  clearMyEntry: () => void
}

export const useQueueStore = create<QueueState>()((set, get) => ({
  myEntry: null,
  adminQueue: [],
  bays: [],
  isRealtimeConnected: false,
  realtimeStatus: 'connecting',

  setMyEntry: (myEntry) => set({ myEntry }),
  setAdminQueue: (adminQueue) => set({ adminQueue }),
  setBays: (bays) => set({ bays }),
  setRealtimeConnected: (isRealtimeConnected) => set({ isRealtimeConnected }),
  setRealtimeStatus: (realtimeStatus) => set({ realtimeStatus }),

  updateMyPosition: (position, estimatedWaitMins) => {
    const { myEntry } = get()
    if (!myEntry) return
    set({ myEntry: { ...myEntry, position, estimatedWaitMins } })
  },

  updateMyStatus: (status, bayNum) => {
    const { myEntry } = get()
    if (!myEntry) return
    set({
      myEntry: {
        ...myEntry,
        status,
        ...(bayNum !== undefined ? { bayNum } : {}),
      },
    })
  },

  clearMyEntry: () => set({ myEntry: null }),
}))
