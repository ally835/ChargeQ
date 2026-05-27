import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useQueueStore } from '@/store/queueStore'
import { useAppStore, useToast } from '@/store/appStore'
import type { ChargerType, PortSide, QueueEntry, MyQueueEntry } from '@/types'

// ── Join queue via server-authoritative RPC ───────────────────────────

export function useJoinQueue() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const siteInfo = useAppStore((s) => s.siteInfo)
  const setMyEntry = useQueueStore((s) => s.setMyEntry)
  const toast = useToast()

  async function joinQueue(charger: ChargerType, portSide: PortSide, plateOverride?: string): Promise<boolean> {
    // Read user fresh from store — avoids stale closure after post-OTP refreshUser
    const user = useAuthStore.getState().user
    if (!user) { setError('Please sign in first'); return false }

    const vehicle = user.vehicles.find((v) => v.id === user.selectedVehicleId) ?? user.vehicles[0]
    const plate = plateOverride ?? vehicle?.plate ?? ''
    if (!plate) { setError('No vehicle plate found — please try again'); return false }

    setError(null)
    setLoading(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: rawData, error: rpcErr } = await supabase.rpc('join_queue', {
      p_site_id:   siteInfo.key,
      p_site_name: siteInfo.name,
      p_name:      user.name,
      p_phone:     user.phone,
      p_plate:     plate,
      p_charger:   charger,
      p_port_side: portSide,
      p_is_remote: false,
      p_user_id:   authUser?.id ?? null,
    })

    setLoading(false)

    // Supabase returns rpcErr for non-2xx — but our RPC returns JSONB errors
    // as 200 with error field OR as 400 with the JSONB in rpcErr.details/message
    if (rpcErr) {
      // Try to parse structured error from the RPC response
      const msg = rpcErr.message ?? ''
      if (msg.includes('no_compatible_bay') || rpcErr.details?.includes?.('no_compatible_bay')) {
        setError('no_compatible_bay')
        return false
      }
      if (msg.includes('already_in_queue')) {
        setError("You're already in the queue at this site.")
        return false
      }
      setError('Could not join the queue. Please try again.')
      return false
    }

    const data = rawData as { error?: string; entry_id?: string; bay_num?: number | null; position?: number; estimated_wait_mins?: number } | null

    if (!data) {
      setError('Could not join the queue. Please try again.')
      return false
    }

    if (data.error === 'already_in_queue') {
      setError("You're already in the queue at this site.")
      return false
    }

    if (data.error === 'no_compatible_bay') {
      setError('no_compatible_bay')
      return false
    }

    const entry: MyQueueEntry = {
      id:                  data.entry_id ?? '',
      siteId:              siteInfo.key,
      siteName:            siteInfo.name,
      plate:               plate,
      charger,
      portSide,
      bayNum:              data.bay_num ?? null,
      position:            data.position ?? 0,
      estimatedWaitMins:   data.estimated_wait_mins ?? 0,
      status:              'waiting',
    }

    setMyEntry(entry)
    toast(`You're #${data.position} in the queue. We'll SMS you when ready! ⚡`)
    return true
  }

  return { joinQueue, loading, error, clearError: () => setError(null) }
}

// ── Leave queue via RPC ───────────────────────────────────────────────

export function useLeaveQueue() {
  const [loading, setLoading] = useState(false)
  const myEntry = useQueueStore((s) => s.myEntry)
  const clearMyEntry = useQueueStore((s) => s.clearMyEntry)
  const toast = useToast()

  async function leaveQueue(): Promise<boolean> {
    if (!myEntry) return false
    setLoading(true)

    const { data } = await supabase.rpc('leave_queue', { p_entry_id: myEntry.id })

    setLoading(false)

    if (data === false) {
      toast('Could not leave queue — please try again.')
      return false
    }

    clearMyEntry()
    toast('You have left the waitlist. Your spot has been released.')
    return true
  }

  return { leaveQueue, loading }
}

// ── Realtime subscription for user's queue entry ──────────────────────

export function useQueueRealtime(siteId: string) {
  const myEntry = useQueueStore((s) => s.myEntry)
  const setMyEntry = useQueueStore((s) => s.setMyEntry)
  const updateMyPosition = useQueueStore((s) => s.updateMyPosition)
  const updateMyStatus = useQueueStore((s) => s.updateMyStatus)
  const setAdminQueue = useQueueStore((s) => s.setAdminQueue)
  const setRealtimeConnected = useQueueStore((s) => s.setRealtimeConnected)
  const setRealtimeStatus = useQueueStore((s) => s.setRealtimeStatus)
  const user = useAuthStore((s) => s.user)
  const toast = useToast()

  const myEntryRef = useRef(myEntry)
  useEffect(() => { myEntryRef.current = myEntry }, [myEntry])

  // Fetch current queue for admin view
  const fetchAdminQueue = useCallback(async () => {
    if (!siteId) return
    const { data } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('site_id', siteId)
      .eq('status', 'waiting')
      .order('position')

    if (data) {
      setAdminQueue(data.map((e) => ({
        id:                 e.id,
        siteId:             e.site_id,
        siteName:           e.site_name,
        userId:             e.user_id ?? '',
        name:               e.name,
        phone:              e.phone,
        plate:              e.plate,
        charger:            e.charger as ChargerType,
        portSide:           (e.port_side ?? 'rr') as PortSide,
        bayNum:             e.bay_num,
        position:           e.position,
        estimatedWaitMins:  e.estimated_wait_mins,
        status:             e.status as QueueEntry['status'],
        isRemote:           e.is_remote,
        joinedAt:           e.joined_at,
      })))
    }
  }, [siteId, setAdminQueue])

  useEffect(() => {
    if (!siteId) return

    fetchAdminQueue()

    // If user has a queue entry, also fetch its current state to sync
    const syncMyEntry = async () => {
      if (!myEntryRef.current || !user) return
      const { data } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('id', myEntryRef.current.id)
        .single()

      if (!data) return

      if (data.status !== myEntryRef.current.status || data.position !== myEntryRef.current.position) {
        updateMyPosition(data.position, data.estimated_wait_mins)
        updateMyStatus(data.status as MyQueueEntry['status'], data.bay_num ?? undefined)
      }
      // Restore portSide from DB if missing (e.g. after page reload)
      if (!myEntryRef.current.portSide && data.port_side) {
        setMyEntry({ ...myEntryRef.current, portSide: data.port_side as PortSide })
      }
    }

    syncMyEntry()

    const channel = supabase
      .channel(`queue-realtime-${siteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `site_id=eq.${siteId}`,
        },
        (payload) => {
          fetchAdminQueue()

          // Check if this update is about our entry
          const entry = myEntryRef.current
          if (!entry) return

          const updated = payload.new as Record<string, unknown>
          if (!updated || updated.id !== entry.id) return

          const newStatus = updated.status as MyQueueEntry['status']
          const newPos = updated.position as number
          const newWait = updated.estimated_wait_mins as number
          const newBay = updated.bay_num as number | null

          updateMyPosition(newPos, newWait)
          updateMyStatus(newStatus, newBay ?? undefined)

          // Notify user when bay becomes ready
          if (newStatus === 'ready' && entry.status !== 'ready') {
            toast(`⚡ Bay ${newBay ?? ''} is yours! Head there now — you have 5 minutes.`)
          }
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED')
        setRealtimeStatus(
          status === 'SUBSCRIBED'    ? 'connected'  :
          status === 'TIMED_OUT'     ? 'timeout'    :
          status === 'CHANNEL_ERROR' ? 'error'      :
          'connecting'
        )
      })

    return () => {
      supabase.removeChannel(channel)
      setRealtimeConnected(false)
      setRealtimeStatus('connecting')
    }
  }, [siteId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { fetchAdminQueue }
}
