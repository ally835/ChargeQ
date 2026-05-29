import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { useAppStore, useToast } from '@/store/appStore'
import { useQueueStore } from '@/store/queueStore'
import type { QueueEntry } from '@/types'

// ── Rate limiting for PIN attempts ────────────────────────────────────
// Simple client-side counter — server bcrypt compare is the real guard

let _pinAttempts = 0
let _pinLockUntil = 0

// SM-specific lockout: 3 attempts → 5-minute lock
let _smPinAttempts = 0
let _smLockUntil = 0
const SM_MAX_ATTEMPTS = 3
const SM_LOCK_MS = 5 * 60 * 1000

// ── Super admin PIN — module-scoped session storage ───────────────────
// Held in memory only; never persisted to localStorage or sessionStorage.
// Cleared when the SA locks out (handleLockOut in AdminSettingsPage).

let _saPinValue = ''
export function getSuperAdminPin(): string { return _saPinValue }
export function clearSuperAdminPin(): void { _saPinValue = '' }

function checkPinRateLimit(): boolean {
  if (Date.now() < _pinLockUntil) return false
  _pinAttempts++
  if (_pinAttempts >= 5) {
    _pinLockUntil = Date.now() + 60_000 // 60s lockout after 5 attempts
    _pinAttempts = 0
  }
  return true
}

// ── Verify super admin PIN ────────────────────────────────────────────

export function useSuperAdminLogin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setAppMode = useAppStore((s) => s.setAppMode)
  const toast = useToast()

  async function verifySuperAdminPin(pin: string): Promise<boolean> {
    if (!checkPinRateLimit()) {
      setError('Too many attempts. Please wait 60 seconds.')
      return false
    }
    setError(null)
    setLoading(true)

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 10_000)
    )

    let data: boolean | null = null
    let rpcErr: unknown = null
    try {
      const result = await Promise.race([
        supabase.rpc('verify_admin_pin', { attempt: pin }),
        timeout,
      ]) as { data: boolean | null; error: unknown }
      data = result.data
      rpcErr = result.error
    } catch (e) {
      rpcErr = e
      console.error('verify_admin_pin error:', e)
    }

    setLoading(false)

    if (rpcErr || data !== true) {
      setError(rpcErr instanceof Error && rpcErr.message === 'timeout'
        ? 'Connection timed out. Check your network and try again.'
        : 'Incorrect PIN. Please try again.'
      )
      return false
    }

    _saPinValue = pin       // stored at module scope — survives re-renders
    setAppMode('superadmin')
    toast('Welcome to ChargeQ HQ ⬡')
    return true
  }

  return { verifySuperAdminPin, loading, error, clearError: () => setError(null) }
}

// ── Site Manager login: Step 1 (email check) ─────────────────────────

export function useSiteManagerLogin() {
  const [step, setStep] = useState<'email' | 'pin' | 'change-pin' | 'pending' | 'locked'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [managerEmail, setManagerEmail] = useState('')
  const [managerName, setManagerName] = useState('')
  const [lockSecsLeft, setLockSecsLeft] = useState(0)
  const setAppMode = useAppStore((s) => s.setAppMode)
  const setAdminSessionManagerId = useAppStore((s) => s.setAdminSessionManagerId)
  const toast = useToast()

  async function checkEmail(email: string): Promise<void> {
    setError(null)
    setLoading(true)
    const { data, error: rpcErr } = await supabase.rpc('check_site_manager_email', {
      manager_email: email.trim().toLowerCase(),
    })
    setLoading(false)

    if (rpcErr) { setError('Connection error. Please try again.'); return }

    const status = data as string
    if (status === 'not_found') { setError('No account found with this email. You can request access below.'); return }
    if (status === 'suspended') { setError('This account has been suspended. Contact hello@chargeq.com.au.'); return }
    if (status === 'pending') { setStep('pending'); return }
    if (status === 'approved') { setManagerEmail(email.trim().toLowerCase()); setStep('pin'); return }
    setError('Unexpected status. Please try again.')
  }

  async function verifyPin(pin: string): Promise<boolean> {
    // Check SM-specific lockout first
    if (Date.now() < _smLockUntil) {
      const secsLeft = Math.ceil((_smLockUntil - Date.now()) / 1000)
      setLockSecsLeft(secsLeft)
      setStep('locked')
      return false
    }

    if (!checkPinRateLimit()) {
      setError('Too many attempts. Please wait 60 seconds.')
      return false
    }
    setError(null)
    setLoading(true)

    const { data, error: rpcErr } = await supabase.rpc('verify_site_manager_pin', {
      manager_email: managerEmail,
      attempt: pin,
    })
    setLoading(false)

    if (rpcErr || !data) { setError('Connection error. Please try again.'); return false }

    const res = data as { status: string; id?: string; name?: string; must_change_pin?: boolean }

    if (res.status === 'wrong_pin') {
      _smPinAttempts++
      if (_smPinAttempts >= SM_MAX_ATTEMPTS) {
        _smLockUntil = Date.now() + SM_LOCK_MS
        _smPinAttempts = 0
        setLockSecsLeft(SM_LOCK_MS / 1000)
        setStep('locked')
        return false
      }
      const remaining = SM_MAX_ATTEMPTS - _smPinAttempts
      setError(`Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`)
      return false
    }
    if (res.status === 'pending') { setStep('pending'); return false }
    if (res.status === 'suspended') { setError('Account suspended.'); return false }

    if (res.status === 'approved' || res.status === 'must_change_pin') {
      _smPinAttempts = 0  // reset on successful login
      setManagerName(res.name ?? '')
      setAdminSessionManagerId(res.id ?? null)

      if (res.must_change_pin) {
        setStep('change-pin')
        return false
      }

      setAppMode('admin')
      toast(`Welcome back, ${(res.name ?? 'Manager').split(' ')[0]}! ⚙`)
      return true
    }

    setError('Login failed. Please try again.')
    return false
  }

  async function requestPinReset(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('sm_request_pin_reset', { p_email: managerEmail })
    const body = encodeURIComponent(
      `Hi ChargeQ,\n\nI have been locked out of my site manager account after too many incorrect PIN attempts.\n\nEmail: ${managerEmail}\n\nPlease reset my PIN so I can log in.\n\nThanks`
    )
    window.open(`mailto:hello@chargeq.com.au?subject=${encodeURIComponent('PIN reset request — Site Manager')}&body=${body}`)
  }

  async function changePin(oldPin: string, newPin: string): Promise<boolean> {
    setLoading(true)
    const { data } = await supabase.rpc('update_manager_pin', {
      manager_email: managerEmail,
      old_attempt:   oldPin,
      new_pin:       newPin,
    })
    setLoading(false)

    if (!data) { setError('Could not update PIN. Please try again.'); return false }

    setAppMode('admin')
    toast(`Welcome back, ${(managerName ?? 'Manager').split(' ')[0]}! ⚙`)
    return true
  }

  function reset() {
    setStep('email')
    setError(null)
    setManagerEmail('')
    setManagerName('')
  }

  return {
    step, loading, error, managerEmail, lockSecsLeft,
    checkEmail, verifyPin, changePin, reset, requestPinReset,
    clearError: () => setError(null),
    goBackToEmail: () => { setStep('email'); setError(null) },
  }
}

// ── Admin: mark bay ready ─────────────────────────────────────────────

export function useAdminBayReady() {
  const [loading, setLoading] = useState(false)
  const siteKey = useAppStore((s) => s.siteKey)
  const siteInfo = useAppStore((s) => s.siteInfo)
  const toast = useToast()

  async function markBayReady(
    entryId:    string,
    driverName: string,
    phone:      string,
    bayNum:     number,
  ): Promise<boolean> {
    setLoading(true)
    const { data } = await (supabase as any).rpc('sm_assign_bay', {
      p_site_id:  siteKey,
      p_entry_id: entryId,
      p_bay_num:  bayNum,
    })
    setLoading(false)

    if (!data) {
      toast('Could not assign bay — driver may have left the queue.')
      return false
    }

    if (phone) {
      await sendSMS(
        phone,
        `ChargeQ: Bay ${bayNum} is ready for you at ${siteInfo.name}. Head there now — you have 5 minutes before your spot is released.`,
      )
      toast(`Bay ${bayNum} assigned — ${driverName} notified by SMS 📱`)
    } else {
      toast(`Bay ${bayNum} assigned to ${driverName} (no phone on file)`)
    }

    return true
  }

  return { markBayReady, loading }
}

// ── Admin: send manual SMS reminder to a driver ───────────────────────

export function useAdminNotifySMS() {
  const siteInfo = useAppStore((s) => s.siteInfo)
  const toast = useToast()

  async function notifyDriver(
    driverName: string,
    phone:      string,
    bayNum?:    number | null,
  ): Promise<void> {
    const bayLabel = bayNum ? ` Bay ${bayNum}` : ''
    const sent = await sendSMS(
      phone,
      `ChargeQ: Reminder — your EV charging bay${bayLabel} at ${siteInfo.name} is ready. Please proceed now.`,
    )
    if (sent) {
      toast(`SMS sent to ${driverName} 📱`)
    } else {
      toast('SMS could not be delivered — check edge function config.')
    }
  }

  return { notifyDriver }
}

// ── Admin: set bay status ─────────────────────────────────────────────

export function useAdminSetBayStatus() {
  const siteKey = useAppStore((s) => s.siteKey)
  const toast = useToast()

  async function setBayStatus(
    bayNum: number,
    status: 'free' | 'occupied' | 'fault',
    plate?: string
  ): Promise<boolean> {
    const { data } = await supabase.rpc('set_bay_status', {
      p_site_id: siteKey,
      p_bay_num: bayNum,
      p_status:  status,
      p_plate:   plate ?? null,
    })

    if (!data) {
      toast('Could not update bay status.')
      return false
    }

    const label = status === 'free' ? 'available ✓' : status === 'fault' ? 'maintenance ✓' : 'occupied'
    toast(`Bay ${bayNum} marked as ${label}`)
    return true
  }

  return { setBayStatus }
}

// ── Admin: simulate a new queue arrival (dev/testing) ────────────────

export function useAdminSimulateArrival() {
  const siteKey = useAppStore((s) => s.siteKey)
  const siteInfo = useAppStore((s) => s.siteInfo)
  const toast = useToast()

  async function simulateArrival(): Promise<void> {
    const bays = useQueueStore.getState().bays
    const charger = bays.find((b) => b.status === 'free')?.type
      ?? bays[0]?.type
      ?? 'type2'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('admin_simulate_arrival', {
      p_site_id:   siteKey,
      p_site_name: siteInfo.name,
      p_charger:   charger,
    })

    if (error) { toast('Simulate failed — network error.'); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any
    if (!result || result.error) {
      const reason = result?.error === 'no_compatible_bay'
        ? 'no compatible bay type for this site'
        : result?.error ?? 'unknown error'
      toast(`Simulate failed — ${reason}`)
      return
    }

    const { plate, position, bay_num: bayNum, entry_id: entryId } = result

    if (!bayNum) {
      // No free bay — vehicle joins queue and waits
      toast(`Sim ${plate} → #${position} in queue (no free bay)`)
      return
    }

    toast(`Sim ${plate} → #${position}, assigned Bay ${bayNum}`)

    // After 4s: driver "arrives" — mark bay occupied, entry left
    setTimeout(async () => {
      await supabase.rpc('set_bay_status', {
        p_site_id: siteKey, p_bay_num: bayNum, p_status: 'occupied', p_plate: plate,
      })
      await supabase.rpc('leave_queue', { p_entry_id: entryId })
      toast(`Sim ${plate} now charging at Bay ${bayNum}`)

      // After 25s more: driver leaves — free the bay
      setTimeout(async () => {
        await supabase.rpc('set_bay_status', {
          p_site_id: siteKey,
          p_bay_num: bayNum,
          p_status:  'free',
          p_plate:   null,
        })
        toast(`Bay ${bayNum} free — sim cycle complete`)
      }, 25_000)
    }, 4_000)
  }

  async function clearSimEntries(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('clear_sim_entries', { p_site_id: siteKey })
    toast('Test vehicles cleared from queue')
  }

  return { simulateArrival, clearSimEntries }
}

// ── Admin: remove from queue ──────────────────────────────────────────

export function useAdminRemoveFromQueue() {
  const toast = useToast()

  async function removeFromQueue(entryId: string, driverName: string): Promise<boolean> {
    const { data } = await supabase.rpc('leave_queue', { p_entry_id: entryId })

    if (!data) {
      toast('Could not remove driver. Please try again.')
      return false
    }

    toast(`${driverName} removed from queue`)
    return true
  }

  return { removeFromQueue }
}
