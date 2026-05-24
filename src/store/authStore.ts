import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Vehicle } from '@/types'
import { supabase } from '@/lib/supabase'

// ── Auth Store ────────────────────────────────────────────────────────
//
// SECURITY: User identity is authoritative from Supabase Auth session.
// localStorage is used only for UI state (name, vehicles) that was
// previously confirmed via OTP. The Supabase JWT is never touched directly —
// the supabase-js client manages it via its own session storage.
//
// Trust chain:
//   Supabase Auth OTP → JWT → supabase.auth.getUser() → user.id is canonical
//   Local profile (name, vehicles) fetched from `users` table using auth user.id
//   Never trust localStorage for anything security-relevant

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean

  // Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
  refreshUser: () => Promise<boolean>
  addVehicle: (vehicle: Vehicle) => void
  updateSelectedVehicle: (id: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({ user, isAuthenticated: user !== null, isLoading: false }),

      setLoading: (isLoading) => set({ isLoading }),

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, isAuthenticated: false })
      },

      refreshUser: async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          set({ user: null, isAuthenticated: false, isLoading: false })
          return false
        }

        // Fetch full profile from Supabase
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (!profile) {
          // Authenticated but no profile yet — new user needs setup
          set({ isAuthenticated: true, isLoading: false, user: null })
          return false
        }

        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', authUser.id)

        const user: User = {
          id: authUser.id,
          name: profile.name,
          phone: profile.phone,
          since: profile.since,
          sessions: profile.sessions,
          vehicles: (vehicles ?? []).map((v) => ({
            id: v.id,
            plate: v.plate,
            nick: v.nick,
            charger: v.charger as Vehicle['charger'],
            portSide: v.port_side as Vehicle['portSide'],
            isDefault: v.is_default,
          })),
          selectedVehicleId:
            vehicles?.find((v) => v.is_default)?.id ??
            vehicles?.[0]?.id ??
            null,
        }

        set({ user, isAuthenticated: true, isLoading: false })
        return true
      },

      addVehicle: (vehicle) => {
        const { user } = get()
        if (!user) return
        set({
          user: {
            ...user,
            vehicles: [...user.vehicles, vehicle],
            selectedVehicleId: user.selectedVehicleId ?? vehicle.id,
          },
        })
      },

      updateSelectedVehicle: (id) => {
        const { user } = get()
        if (!user) return
        set({ user: { ...user, selectedVehicleId: id } })
      },
    }),
    {
      name: 'chargeq-user-profile',
      // Only persist non-sensitive UI data — never the JWT
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
)
