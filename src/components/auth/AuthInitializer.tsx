import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

/**
 * AuthInitializer — mounts once at app root.
 * Subscribes to Supabase auth state changes and syncs to Zustand store.
 * Replaces the V2 pattern of reading chargeq_user from localStorage directly.
 */
export function AuthInitializer() {
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)
  const refreshUser = useAuthStore((s) => s.refreshUser)

  useEffect(() => {
    // 1. Check existing session immediately
    refreshUser()

    // 2. Subscribe to auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          return
        }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await refreshUser()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
