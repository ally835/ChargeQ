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
      ]) as Awaited<ReturnType<typeof supabase.rpc<boolean>>>
      data = result.data as boolean | null
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
  const [step, setStep] = useState<'email' | 'pin' | 'change-pin' | 'pending'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [managerEmail, setManagerEmail] = useState('')
  const [managerName, setManagerName] = useState('')
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

    if (res.status === 'wrong_pin') { setError('Incorrect PIN. Please try again.'); return false }
    if (res.status === 'pending') { setStep('pending'); return false }
    if (res.status === 'suspended') { setError('Account suspended.'); return false }

    if (res.status === 'approved' || res.status === 'must_change_pin') {
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
    step, loading, error, managerEmail,
    checkEmail, verifyPin, changePin, reset,
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
    phone?:     string,
    bayNum?:    number | null,
  ): Promise<boolean> {
    setLoading(true)
    const { data } = await supabase.rpc('admin_mark_bay_ready', {
      p_site_id:  siteKey,
      p_entry_id: entryId,
    })
    setLoading(false)

    if (!data) {
      toast('Could not mark bay ready. Please try again.')
      return false
    }

    // Send SMS notification to driver
    if (phone) {
      const bayLabel = bayNum ? ` Bay ${bayNum}` : ''
      await sendSMS(
        phone,
        `ChargeQ: Your EV charging bay is ready!${bayLabel} at ${siteInfo.name}. You have 5 minutes before your spot is released. Head there now.`,
      )
      toast(`Bay freed — ${driverName} has been notified by SMS 📱`)
    } else {
      toast(`Bay freed — ${driverName} marked ready (no phone on file)`)
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
    status: 'free' | 'occupied',
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

    toast(`Bay ${bayNum} marked as ${status === 'free' ? 'available ✓' : 'occupied'}`)
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
    const n = Math.floor(1000 + Math.random() * 9000)
    const { data, error } = await supabase.rpc('join_queue', {
      p_site_id:   siteKey,
      p_site_name: siteInfo.name,
      p_name:      `Test Driver ${n}`,
      p_phone:     '+61400000000',
      p_plate:     `SIM${n}`,
      p_charger:   'ccs2',
      p_port_side: 'rr',
      p_is_remote: false,
      p_user_id:   null,
    })

    if (error || !data) {
      toast('Simulate failed — check bay availability.')
      return
    }

    toast(`Simulated arrival: SIM${n} → position ${data.position}`)
  }

  return { simulateArrival }
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
