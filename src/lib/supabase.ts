import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'ChargeQ: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment. ' +
    'Copy .env.example to .env.local and fill in your Supabase credentials.'
  )
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Use Supabase's built-in session storage — never raw localStorage access
    storage: window.localStorage,
    storageKey: 'chargeq-auth',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// ── Auth helpers ──────────────────────────────────────────────────────

/**
 * Get the current authenticated user's JWT.
 * Returns null if not authenticated.
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Get the current user's ID from the session.
 * Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession()
  return session?.user?.id ?? null
}

/**
 * Normalize an Australian mobile to E.164.
 * Accepts: "0411 111 111", "0411111111", "+61411111111"
 * Returns: "+61411111111"
 */
export function normalizePhone(phone: string): string {
  const s = phone.replace(/[\s\-()]/g, '')
  if (s.startsWith('+')) return s
  if (s.startsWith('61') && s.length === 11) return '+' + s
  if (s.startsWith('0') && s.length === 10) return '+61' + s.slice(1)
  return s
}

/**
 * Call a Supabase RPC function with typed input/output.
 * Throws on network or Supabase error.
 */
export async function rpc<T>(
  fn: string,
  args: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(`RPC ${fn} failed: ${error.message}`)
  return data as T
}
