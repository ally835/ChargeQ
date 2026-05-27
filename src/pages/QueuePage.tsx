import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useQueueStore } from '@/store/queueStore'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/lib/supabase'
import { useJoinQueue, useQueueRealtime } from '@/hooks/useQueue'
import { useSuperAdminLogin } from '@/hooks/useAdmin'
import { useNavigate } from 'react-router-dom'

import { PhoneLandingScreen } from '@/components/auth/PhoneLandingScreen'
import { OtpVerifyScreen } from '@/components/auth/OtpVerifyScreen'
import { AccountSetupScreen } from '@/components/auth/AccountSetupScreen'
import { WelcomeDashboard } from '@/components/queue/WelcomeDashboard'
import { VehiclePicker } from '@/components/queue/VehiclePicker'
import { PortOnlyPicker } from '@/components/queue/PortOnlyPicker'
import { MyAccountScreen } from '@/components/auth/MyAccountScreen'
import { QueueJoinFlow } from '@/components/queue/QueueJoinFlow'
import { QueueWaitingScreen } from '@/components/queue/QueueWaitingScreen'
import { ExpiredScreen } from '@/components/queue/ExpiredScreen'
import { ChargingScreen } from '@/components/queue/ChargingScreen'
import { VehicleChoiceSheet } from '@/components/queue/VehicleChoiceSheet'
import { AddVehicleSheet } from '@/components/queue/AddVehicleSheet'
import { TempVehicleSheet } from '@/components/queue/TempVehicleSheet'
import { SiteManagerLoginOverlay } from '@/components/admin/SiteManagerLoginOverlay'
import { AdminPinOverlay } from '@/components/admin/AdminPinOverlay'

import type { Bay, ChargerType, PortSide, Vehicle } from '@/types'

// ── Screen flow ───────────────────────────────────────────────────────
//
// New user:      phone → otp → setup (incl charger+port) → AUTO JOIN → queue
// Returning (1 car): phone → otp → AUTO JOIN → queue
// Returning (2+ cars): phone → otp → vehicle picker → AUTO JOIN → queue
//
// From dashboard: join queue → vehicle picker (if 2+ cars) or direct join
// Admin entry: phone screen → "Administration ONLY" button → hub modal

type Screen =
  | 's-phone'
  | 's-otp'
  | 's-setup'
  | 's-pick-vehicle'
  | 's-port-only'     // Has charger type, just needs port side
  | 's-queue'
  | 's-welcome'
  | 's-my-account'
  | 's-join'

type AdminFlow = 'none' | 'hub' | 'superadmin-pin' | 'manager-login'

export default function QueuePage() {
  const { user, isAuthenticated, isLoading, updateSelectedVehicle } = useAuthStore()
  const { bays, setBays, myEntry, setMyEntry, clearMyEntry } = useQueueStore()
  const siteKey = useAppStore((s) => s.siteKey)
  const siteInfo = useAppStore((s) => s.siteInfo)
  const siteStatus = useAppStore((s) => s.siteStatus)
  const setAppMode = useAppStore((s) => s.setAppMode)
  const navigate = useNavigate()

  const [screen, setScreen] = useState<Screen>('s-phone')
  const [otpPhone, setOtpPhone] = useState('')
  const [adminFlow, setAdminFlow] = useState<AdminFlow>('none')
  const [queueStats, setQueueStats] = useState({ count: 0, waitMins: 0 })
  const [autoJoining, setAutoJoining] = useState(false)
  const [finderChargerFilter, setFinderChargerFilter] = useState<string | null>(null)
  const [noCompatibleBay, setNoCompatibleBay] = useState<string | null>(null) // charger type that failed
  // Tracks the vehicle that needs port-only selection
  const [portOnlyVehicle, setPortOnlyVehicle] = useState<{ id: string; plate: string; charger: ChargerType } | null>(null)
  const [showVehicleChoice, setShowVehicleChoice] = useState(false)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showTempVehicle, setShowTempVehicle] = useState(false)

  const [chargingLoading, setChargingLoading] = useState(false)

  const { joinQueue, loading: joinLoading, error: joinError, clearError } = useJoinQueue()
  const { verifySuperAdminPin, loading: saLoading, error: saError } = useSuperAdminLogin()
  useQueueRealtime(siteKey)

  // ── Auto-join logic ─────────────────────────────────────────────────
  // Called after OTP verify (new or returning) and after account setup.
  // Routes to:
  //   - s-queue if already in an active queue at this site
  //   - auto-joins if 1 vehicle saved with charger+port
  //   - s-pick-vehicle if 2+ vehicles
  //   - s-join if vehicle has no port side saved

  async function attemptAutoJoin(currentUser: typeof user) {
    if (!currentUser) return

    // Check for existing active queue entry at this site
    const { data: existing } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('site_id', siteKey)
      .in('status', ['waiting', 'ready', 'charging'])
      .eq('user_id', currentUser.id)
      .maybeSingle()

    if (existing) {
      setMyEntry({
        id: existing.id, siteId: existing.site_id, siteName: existing.site_name,
        plate: existing.plate, charger: existing.charger as ChargerType,
        portSide: (existing.port_side ?? 'rr') as PortSide,
        bayNum: existing.bay_num, position: existing.position,
        estimatedWaitMins: existing.estimated_wait_mins,
        status: existing.status as 'waiting' | 'ready' | 'charging',
      })
      setScreen('s-queue')
      return
    }

    const vehicles = currentUser.vehicles
    if (vehicles.length === 0) {
      setScreen('s-welcome')
      return
    }

    if (vehicles.length === 1) {
      const v = vehicles[0]
      if (v.charger && v.portSide) {
        // Check compatibility first
        const { data: bayData } = await supabase.from('bays').select('type').eq('site_id', siteKey)
        const bayList = bayData ?? []
        if (bayList.length > 0 && !bayList.some((b: any) => b.type === v.charger)) {
          setNoCompatibleBay(v.charger)
          setScreen('s-pick-vehicle')
          return
        }
        // Complete vehicle — auto join immediately
        setAutoJoining(true)
        console.log('=== JOINING QUEUE ===', v.charger, v.portSide, v.plate)
        const ok = await joinQueue(v.charger as ChargerType, v.portSide as PortSide, v.plate)
        console.log('=== JOIN RESULT ===', ok)
        setAutoJoining(false)
        if (ok) { setScreen('s-queue'); return }
        console.log('=== JOIN FAILED — joinError:', 'checking store')
      } else if (v.charger && !v.portSide) {
        // Has charger type but missing port — show port-only picker
        setPortOnlyVehicle({ id: v.id, plate: v.plate, charger: v.charger as ChargerType })
        setScreen('s-port-only')
        return
      }
      // No charger at all — full join flow
      setScreen('s-join')
      return
    }

    // Multiple vehicles — show picker directly, skip welcome dashboard
    setScreen('s-pick-vehicle')
  }

  // ── On OTP success ──────────────────────────────────────────────────

  async function handleOtpSuccess(destination: 'welcome' | 'setup') {
    if (destination === 'setup') {
      setScreen('s-setup')
      return
    }
    const { refreshUser } = useAuthStore.getState()
    await refreshUser()
    const { user: currentUser } = useAuthStore.getState()

    // If already in an active queue at this site, restore that screen
    if (currentUser) {
      const { data: existing } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('site_id', siteKey)
        .in('status', ['waiting', 'ready', 'charging'])
        .eq('user_id', currentUser.id)
        .maybeSingle()

      if (existing) {
        setMyEntry({
          id: existing.id, siteId: existing.site_id, siteName: existing.site_name,
          plate: existing.plate, charger: existing.charger as ChargerType,
          portSide: (existing.port_side ?? 'rr') as PortSide,
          bayNum: existing.bay_num, position: existing.position,
          estimatedWaitMins: existing.estimated_wait_mins,
          status: existing.status as 'waiting' | 'ready' | 'charging',
        })
        setScreen('s-queue')
        return
      }
    }

    // Always land on welcome dashboard — user picks their vehicle from here
    setScreen('s-welcome')
  }

  // ── After setup completes ───────────────────────────────────────────

  async function handleSetupComplete() {
    // Wait for DB write and auth session to fully propagate
    await new Promise((r) => setTimeout(r, 1200))
    let { user: currentUser } = useAuthStore.getState()
    if (!currentUser) {
      const { refreshUser } = useAuthStore.getState()
      await refreshUser()
      currentUser = useAuthStore.getState().user
    }
  console.log('calling attemptAutoJoin with:', currentUser)
  await attemptAutoJoin(currentUser)
}

  // ── Vehicle picker selection ────────────────────────────────────────

  async function handleVehiclePicked(vehicle: Vehicle) {
    // For saved vehicles, update selection
    if (!vehicle.id.startsWith('temp_')) {
      updateSelectedVehicle(vehicle.id)
    }

    // Client-side check: does this site have a bay matching this charger type?
    setNoCompatibleBay(null)
    if (vehicle.charger) {
      // Use loaded bays, or fetch fresh if store empty
      let bayList = bays
      if (bayList.length === 0) {
        const { data } = await supabase.from('bays').select('num,type,status').eq('site_id', siteKey)
        bayList = (data ?? []).map((b: any) => ({ num: b.num, type: b.type, status: b.status, plate: b.plate ?? null }))
      }
      if (bayList.length > 0) {
        const hasCompatible = bayList.some((b) => b.type === vehicle.charger)
        if (!hasCompatible) {
          setNoCompatibleBay(vehicle.charger)
          return
        }
      }
    }

    if (vehicle.charger && vehicle.portSide) {
      const ok = await joinQueue(vehicle.charger as ChargerType, vehicle.portSide as PortSide, vehicle.plate)
      if (ok) { setScreen('s-queue'); return }
    } else {
      // Vehicle incomplete — go through flow to pick port
      setScreen('s-join')
    }
  }

  // ── Port-only confirm ───────────────────────────────────────────────

  async function handlePortOnlyConfirm(portSide: PortSide) {
    if (!portOnlyVehicle) return
    const ok = await joinQueue(portOnlyVehicle.charger, portSide)
    if (ok) setScreen('s-queue')
  }

  function handleFindNearby(chargerType: string) {
    setFinderChargerFilter(chargerType)
    navigate('/finder')
  }

  async function handleJoinSubmit(charger: ChargerType, port: PortSide) {
    const ok = await joinQueue(charger, port)
    if (ok) setScreen('s-queue')
  }

  // ── Quick join from dashboard (already verified) ────────────────────

  async function handleQuickJoin() {
    if (!user) return
    // Use whichever vehicle is currently selected (works for 1 or multiple)
    const selectedVehicle = user.vehicles.find((v) => v.id === user.selectedVehicleId)
      ?? user.vehicles[0]

    // Client-side compatibility check
    if (selectedVehicle?.charger && bays.length > 0) {
      const hasCompatible = bays.some((b) => b.type === selectedVehicle.charger)
      if (!hasCompatible) {
        setNoCompatibleBay(selectedVehicle.charger)
        setScreen('s-pick-vehicle')
        return
      }
    }
    setNoCompatibleBay(null)

    if (selectedVehicle?.charger && selectedVehicle?.portSide) {
      const ok = await joinQueue(
        selectedVehicle.charger as ChargerType,
        selectedVehicle.portSide as PortSide,
        selectedVehicle.plate
      )
      if (ok) { setScreen('s-queue'); return }
    } else if (user.vehicles.length > 1) {
      setScreen('s-pick-vehicle')
    } else {
      setScreen('s-join')
    }
  }

  // ── Restore session on load ─────────────────────────────────────────

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user) {
      // Only reset to phone if not mid-flow — never interrupt setup or otp
      setScreen((prev) => {
        if (prev === 's-setup' || prev === 's-otp' || prev === 's-queue' || prev === 's-join' || prev === 's-port-only') return prev
        return 's-phone'
      })
      return
    }
    // Already authed — only restore if sitting at phone screen
    async function restore() {
      setScreen((prev) => {
        if (prev !== 's-phone') return prev  // don't interrupt active screens
        return prev
      })
      // Small delay to ensure auth session is fully established
      await new Promise((r) => setTimeout(r, 800))
      // Check current screen value before doing anything
      const { data } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('site_id', siteKey)
        .in('status', ['waiting', 'ready', 'charging'])
        .eq('user_id', user!.id)
        .maybeSingle()

      if (data) {
        setMyEntry({
          id: data.id, siteId: data.site_id, siteName: data.site_name,
          plate: data.plate, charger: data.charger as ChargerType,
          portSide: (data.port_side ?? 'rr') as PortSide,
          bayNum: data.bay_num, position: data.position,
          estimatedWaitMins: data.estimated_wait_mins,
          status: data.status as 'waiting' | 'ready' | 'charging',
        })
        setScreen((prev) => prev === 's-phone' || prev === 's-welcome' ? 's-queue' : prev)
      } else {
        setScreen((prev) => prev === 's-phone' ? 's-welcome' : prev)
      }
    }
    restore()
  }, [isAuthenticated, isLoading, user?.id, siteKey]) // eslint-disable-line

  // ── Fetch bays + stats ──────────────────────────────────────────────

  useEffect(() => {
    async function fetchBays() {
      const { data } = await supabase.from('bays').select('*').eq('site_id', siteKey).order('num')
      if (data) setBays(data.map((b) => ({
        num: b.num, type: b.type as Bay['type'],
        status: b.status as Bay['status'], plate: b.plate,
        faultType: b.fault_type ?? undefined,
      })))
    }
    async function fetchStats() {
      const { data } = await supabase.rpc('get_site_queue_stats', { p_site_id: siteKey })
      if (data) setQueueStats({ count: data.queue_count ?? 0, waitMins: data.wait_mins ?? 0 })
    }
    fetchBays()
    fetchStats()
  }, [siteKey]) // eslint-disable-line

  // ── SA PIN verify ───────────────────────────────────────────────────

  async function handleSAPin(pin: string) {
    const ok = await verifySuperAdminPin(pin)
    if (ok) { setAdminFlow('none'); navigate('/admin/queue') }
  }

  // ── Loading ─────────────────────────────────────────────────────────

  if (siteStatus === 'resolving' || isLoading || autoJoining) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
        <div className="cq-spinner" />
        <div style={{ fontSize: 13, color: 'var(--mint)' }}>
          {autoJoining ? 'Joining the queue...' : 'Loading ChargeQ...'}
        </div>
      </div>
    )
  }

  if (siteStatus === 'invalid') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16, padding: '0 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 36 }}>⚡</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--cream)' }}>
          Site not found
        </div>
        <div style={{ fontSize: 14, color: 'var(--mint)', lineHeight: 1.6, maxWidth: 280 }}>
          This QR code doesn't match an active ChargeQ location. Please scan the code at your charging bay.
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'monospace', background: 'var(--bg3)', padding: '6px 12px', borderRadius: 6 }}>
          {siteKey}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── Phone entry (landing screen) ── */}
      {screen === 's-phone' && (
        <div style={{ height: '100%' }}>
          <PhoneLandingScreen
            onOtpSent={(p) => { setOtpPhone(p); setScreen('s-otp') }}
            onAdminHubOpen={() => setAdminFlow('hub')}
          />
        </div>
      )}

      {/* ── OTP verification ── */}
      {screen === 's-otp' && (
        <div style={{ animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)' }}>
          <OtpVerifyScreen
            phone={otpPhone}
            onSuccess={handleOtpSuccess}
            onBack={() => setScreen('s-phone')}
          />
        </div>
      )}

      {/* ── New user registration ── */}
      {screen === 's-setup' && (
        <div style={{ animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)' }}>
          <AccountSetupScreen onComplete={handleSetupComplete} />
        </div>
      )}

      {/* ── Port-only picker (has charger, missing port side) ── */}
      {screen === 's-port-only' && portOnlyVehicle && (
        <div style={{ animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)' }}>
          <PortOnlyPicker
            vehicleId={portOnlyVehicle.id}
            vehiclePlate={portOnlyVehicle.plate}
            charger={portOnlyVehicle.charger}
            onConfirm={handlePortOnlyConfirm}
          />
        </div>
      )}

      {/* ── Multi-vehicle picker ── */}
      {screen === 's-pick-vehicle' && (
        <div style={{ animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)' }}>
          <VehiclePicker
            onPick={handleVehiclePicked}
            loading={joinLoading}
            error={noCompatibleBay ? 'no_compatible_bay' : joinError}
            onFindNearby={handleFindNearby}
          />
        </div>
      )}

      {/* ── Queue expired — show rejoin screen ── */}
      {screen === 's-queue' && myEntry?.status === 'expired' && (
        <div style={{ animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)' }}>
          <ExpiredScreen
            charger={myEntry.charger}
            portSide={myEntry.portSide ?? 'rr'}
            siteName={myEntry.siteName}
            onRejoin={async () => {
              await joinQueue(myEntry.charger, myEntry.portSide ?? 'rr')
              // joinQueue calls setMyEntry on success — status becomes 'waiting'
              // which automatically hides this screen
            }}
            onDecline={() => { clearMyEntry(); setScreen('s-welcome') }}
          />
        </div>
      )}

      {/* ── Charging in progress ── */}
      {screen === 's-queue' && myEntry?.status === 'charging' && (
        <div style={{ animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)' }}>
          <ChargingScreen
            bayNum={myEntry.bayNum}
            plate={myEntry.plate}
            siteName={myEntry.siteName}
            loading={chargingLoading}
            onDone={async () => {
              setChargingLoading(true)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any).rpc('done_charging', { p_entry_id: myEntry.id })
              setChargingLoading(false)
              clearMyEntry()
              setScreen('s-welcome')
            }}
          />
        </div>
      )}

      {/* ── Queue waiting / ready ── */}
      {screen === 's-queue' && myEntry?.status !== 'expired' && myEntry?.status !== 'charging' && (
        <div style={{ animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)' }}>
          <QueueWaitingScreen
            onLeft={() => { clearMyEntry(); setScreen('s-welcome'); }}
            onConfirmedArrival={async () => {
              if (!myEntry) return
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any).rpc('confirm_arrival', {
                p_entry_id: myEntry.id,
                p_bay_num:  myEntry.bayNum ?? 0,
              })
              setMyEntry({ ...myEntry, status: 'charging' })
            }}
            onExpired={async () => {
              if (!myEntry) return
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any).rpc('expire_my_entry', { p_entry_id: myEntry.id })
              // Realtime will update status to 'expired' — ExpiredScreen renders automatically
            }}
          />
        </div>
      )}

      {/* ── Welcome dashboard (returning users not in queue) ── */}
      {screen === 's-welcome' && (
        <div style={{ animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)' }}>
          <WelcomeDashboard
            queueCount={queueStats.count}
            waitMins={queueStats.waitMins}
            bays={bays}
            onJoinQueue={() => setShowVehicleChoice(true)}
            onQuickJoin={handleQuickJoin}
            onManageAccount={() => setScreen('s-my-account')}
            onSelectVehicle={(id) => updateSelectedVehicle(id)}
          />
        </div>
      )}

      {/* ── Account management ── */}
      {screen === 's-my-account' && (
        <div style={{ animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)' }}>
          <MyAccountScreen onBack={() => setScreen('s-welcome')} />
        </div>
      )}

      {/* ── Manual charger/port selection (edge case) ── */}
      {screen === 's-join' && (
        <div style={{ animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)' }}>
          <QueueJoinFlow
            onSubmit={handleJoinSubmit}
            onBack={() => setScreen('s-welcome')}
            loading={joinLoading}
            error={joinError}
          />
        </div>
      )}

      {/* ── Vehicle choice sheet (Add to Garage vs Temp) ── */}
      {showVehicleChoice && (
        <VehicleChoiceSheet
          onAddToGarage={() => { setShowVehicleChoice(false); setShowAddVehicle(true) }}
          onTempCar={() => { setShowVehicleChoice(false); setShowTempVehicle(true) }}
          onClose={() => setShowVehicleChoice(false)}
        />
      )}

      {/* ── Add to Garage sheet ── */}
      {showAddVehicle && (
        <AddVehicleSheet
          onConfirm={(vehicle) => { setShowAddVehicle(false); handleVehiclePicked(vehicle) }}
          onClose={() => setShowAddVehicle(false)}
        />
      )}

      {/* ── Temporary car sheet ── */}
      {showTempVehicle && (
        <TempVehicleSheet
          onConfirm={(vehicle) => { setShowTempVehicle(false); handleVehiclePicked(vehicle) }}
          onClose={() => setShowTempVehicle(false)}
        />
      )}

      {/* ── Admin hub modal ── */}
      {adminFlow === 'hub' && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 800, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}
          onClick={() => setAdminFlow('none')}
        >
          <div
            style={{ background: 'var(--bg2)', border: '0.5px solid rgba(239,159,39,0.25)', borderTop: '2px solid var(--a)', borderRadius: '20px 20px 0 0', padding: 'max(20px,20px) 20px max(24px,env(safe-area-inset-bottom,24px))', width: '100%', maxWidth: 480, animation: 'slideSheet 0.3s cubic-bezier(.2,.8,.3,1)', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--amber-t)', marginBottom: 4 }}>ChargeQ Administration</div>
            <div style={{ fontSize: 12, color: 'var(--mint)', marginBottom: 20 }}>Select your access level</div>

            <button onClick={() => setAdminFlow('superadmin-pin')} style={{ width: '100%', padding: '14px 16px', marginBottom: 10, background: 'rgba(55,138,221,0.1)', border: '0.5px solid rgba(55,138,221,0.3)', borderRadius: 'var(--rads)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24 }}>⬡</div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#85B7EB', marginBottom: 2 }}>ChargeQ Super Admin</div>
                <div style={{ fontSize: 11, color: 'rgba(55,138,221,0.5)' }}>System administration</div>
              </div>
            </button>

            <button onClick={() => setAdminFlow('manager-login')} style={{ width: '100%', padding: '14px 16px', marginBottom: 16, background: 'var(--al)', border: '0.5px solid var(--ab)', borderRadius: 'var(--rads)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24 }}>🏢</div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--amber-t)', marginBottom: 2 }}>Site Manager Login</div>
                <div style={{ fontSize: 11, color: 'rgba(239,159,39,0.6)' }}>Manage your site's queue and bays</div>
              </div>
            </button>

            <button className="btn-secondary" onClick={() => setAdminFlow('none')} style={{ margin: 0 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Super admin PIN ── */}
      {adminFlow === 'superadmin-pin' && (
        <AdminPinOverlay
          title="ChargeQ Super Admin"
          subtitle="Enter your super admin PIN to access the management console."
          onSuccess={handleSAPin}
          onCancel={() => setAdminFlow('none')}
          loading={saLoading}
          error={saError}
        />
      )}

      {/* ── Site manager login ── */}
      {adminFlow === 'manager-login' && (
        <SiteManagerLoginOverlay onClose={() => setAdminFlow('none')} />
      )}
    </>
  )
}
