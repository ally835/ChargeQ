// Client-side helper for the send-sms Supabase Edge Function.
// Requires VITE_SUPABASE_URL and VITE_CHARGEQ_FUNCTION_SECRET env vars.
// Never call Twilio directly from the client.

const EDGE_FUNCTION_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON_KEY           = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const FUNCTION_SECRET    = import.meta.env.VITE_CHARGEQ_FUNCTION_SECRET as string | undefined

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!EDGE_FUNCTION_BASE || !FUNCTION_SECRET || !ANON_KEY) {
    console.warn('ChargeQ SMS: edge function not configured — set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and VITE_CHARGEQ_FUNCTION_SECRET')
    return false
  }

  try {
    const res = await fetch(`${EDGE_FUNCTION_BASE}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'Authorization':     `Bearer ${ANON_KEY}`,
        'x-chargeq-secret':  FUNCTION_SECRET,
      },
      body: JSON.stringify({ to, body }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.warn('ChargeQ SMS failed:', err)
      return false
    }

    return true
  } catch (err) {
    console.warn('ChargeQ SMS network error:', err)
    return false
  }
}
