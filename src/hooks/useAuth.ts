import { useState, useRef } from 'react'
import { supabase, normalizePhone } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/store/appStore'
import { isValidAuMobile } from '@/utils'
import type { ChargerType, PortSide, Vehicle } from '@/types'

// ── Send OTP ──────────────────────────────────────────────────────────

export function useSendOTP() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendOTP(rawPhone: string): Promise<boolean> {
    const clean = rawPhone.replace(/\s/g, '')
    if (!isValidAuMobile(clean)) {
      setError('Please enter a valid Australian mobile (04XX XXX XXX)')
      return false
    }
    setError(null)
    setLoading(true)

    const phone = normalizePhone(clean)
    const { error: supabaseErr } = await supabase.auth.signInWithOtp({ phone })

    setLoading(false)
    if (supabaseErr) {
      setError('Could not send code. Please try again.')
      return false
    }
    return true
  }

  return { sendOTP, loading, error, clearError: () => setError(null) }
}

// ── Verify OTP ────────────────────────────────────────────────────────

export function useVerifyOTP() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refreshUser = useAuthStore((s) => s.refreshUser)

  async function verifyOTP(
    rawPhone: string,
    token: string
  ): Promise<'welcome' | 'setup' | null> {
    if (token.length < 6) return null
    setError(null)
    setLoading(true)

    const phone = normalizePhone(rawPhone.replace(/\s/g, ''))
    const { error: supabaseErr } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    })

    if (supabaseErr) {
      setLoading(false)
      setError('Incorrect code. Please try again.')
      return null
    }

    // refreshUser returns true if an existing profile was found, false if new user
    const profileFound = await refreshUser()

    setLoading(false)
    return profileFound ? 'welcome' : 'setup'
  }

  return { verifyOTP, loading, error, clearError: () => setError(null) }
}

// ── Resend OTP timer ──────────────────────────────────────────────────

export function useResendTimer(initialSeconds = 30) {
  const [seconds, setSeconds] = useState(0)
  const [canResend, setCanResend] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startTimer() {
    setCanResend(false)
    setSeconds(initialSeconds)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!)
          setCanResend(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  return { seconds, canResend, startTimer }
}

// ── Create Account ────────────────────────────────────────────────────

export function useCreateAccount() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setUser = useAuthStore((s) => s.setUser)
  const toast = useToast()

  async function createAccount(params: {
    name: string
    plate: string
    nick: string
    charger: ChargerType
    portSide?: PortSide
  }): Promise<boolean> {
    setError(null)
    setLoading(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      setError('Session expired. Please sign in again.')
      setLoading(false)
      return false
    }

    const phone = authUser.phone ?? ''
    const now = new Date()
    const since = now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

    // Insert user profile
    const { error: userErr } = await supabase.from('users').insert({
      id: authUser.id,
      phone,
      name: params.name.trim(),
      since,
      sessions: 0,
    })

    if (userErr) {
      setError('Could not save your account. Please try again.')
      setLoading(false)
      return false
    }

    // Insert first vehicle
    const { data: vehicleData, error: vehicleErr } = await supabase
      .from('vehicles')
      .insert({
        user_id: authUser.id,
        plate: params.plate.trim().toUpperCase(),
        nick: params.nick.trim() || params.plate.trim().toUpperCase(),
        charger: params.charger,
        port_side: params.portSide ?? null,
        is_default: true,
      })
      .select()
      .single()

    if (vehicleErr || !vehicleData) {
      setError('Account created but could not save vehicle. Please add it in settings.')
      setLoading(false)
      // Still navigate — account exists
      setUser({
        id: authUser.id,
        name: params.name.trim(),
        phone,
        since,
        sessions: 0,
        vehicles: [],
        selectedVehicleId: null,
      })
      return true
    }

    setUser({
      id: authUser.id,
      name: params.name.trim(),
      phone,
      since,
      sessions: 0,
      vehicles: [
        {
          id: vehicleData.id,
          plate: vehicleData.plate,
          nick: vehicleData.nick,
          charger: vehicleData.charger as ChargerType,
          portSide: (vehicleData.port_side as PortSide) ?? undefined,
          isDefault: true,
        },
      ],
      selectedVehicleId: vehicleData.id,
    })

    toast(`Account created! Welcome, ${params.name.trim().split(' ')[0]}! ⚡`)
    setLoading(false)
    return true
  }

  return { createAccount, loading, error }
}

// ── Add Vehicle ───────────────────────────────────────────────────────

export function useAddVehicle() {
  const [loading, setLoading] = useState(false)
  const addVehicle = useAuthStore((s) => s.addVehicle)
  const toast = useToast()

  async function addVehicleToAccount(params: {
    plate: string
    nick: string
    charger: ChargerType
    portSide?: PortSide
  }): Promise<Vehicle | null> {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return null

    setLoading(true)

    // Check for duplicate plate on this account
    const { data: existing } = await supabase
      .from('vehicles')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('plate', params.plate.trim().toUpperCase())
      .single()

    if (existing) {
      setLoading(false)
      toast('This plate is already in your garage.')
      return null
    }

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        user_id: authUser.id,
        plate: params.plate.trim().toUpperCase(),
        nick: params.nick.trim() || params.plate.trim().toUpperCase(),
        charger: params.charger,
        port_side: params.portSide ?? null,
        is_default: false,
      })
      .select()
      .single()

    setLoading(false)
    if (error || !data) return null

    const vehicle: Vehicle = {
      id: data.id,
      plate: data.plate,
      nick: data.nick,
      charger: data.charger as ChargerType,
      portSide: (data.port_side as PortSide) ?? undefined,
      isDefault: false,
    }

    addVehicle(vehicle)
    toast(`${data.nick} added to your garage ✓`)
    return vehicle
  }

  return { addVehicleToAccount, loading }
}

// ── Sign Out ──────────────────────────────────────────────────────────

export function useSignOut() {
  const signOut = useAuthStore((s) => s.signOut)
  const toast = useToast()

  async function handleSignOut() {
    await signOut()
    toast('Signed out successfully')
  }

  return { signOut: handleSignOut }
}
