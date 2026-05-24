// supabase/functions/send-sms/index.ts
//
// Sends an SMS via Twilio. Called by the ChargeQ admin panel
// when a driver's bay is ready or an admin manually notifies a driver.
//
// Required Supabase secrets:
//   supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxx
//   supabase secrets set TWILIO_AUTH_TOKEN=xxxxxxxx
//   supabase secrets set TWILIO_PHONE_NUMBER=+61xxxxxxxxx
//   supabase secrets set CHARGEQ_FUNCTION_SECRET=<openssl rand -hex 32>
//
// Deploy:
//   supabase functions deploy send-sms

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-chargeq-secret',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
  const TWILIO_AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')
  const TWILIO_FROM        = Deno.env.get('TWILIO_PHONE_NUMBER')
  const SHARED_SECRET      = Deno.env.get('CHARGEQ_FUNCTION_SECRET')

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM || !SHARED_SECRET) {
    console.error('Missing required secrets')
    return new Response(JSON.stringify({ error: 'Function not configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Verify shared secret to prevent unauthenticated callers
  const callerSecret = req.headers.get('x-chargeq-secret')
  if (callerSecret !== SHARED_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  let body: { to?: string; body?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { to, body: message } = body

  if (!to || !message) {
    return new Response(JSON.stringify({ error: 'Missing to or body' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Normalize and validate Australian mobile
  const cleaned = String(to).replace(/[\s\-()]/g, '')
  const normalized = cleaned.startsWith('+')
    ? cleaned
    : cleaned.startsWith('614') && cleaned.length === 11
      ? '+' + cleaned
      : cleaned.startsWith('04') && cleaned.length === 10
        ? '+61' + cleaned.slice(1)
        : cleaned

  if (!/^\+614\d{8}$/.test(normalized)) {
    return new Response(JSON.stringify({ error: 'Invalid Australian mobile number' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

  const twilioRes = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To:   normalized,
      From: TWILIO_FROM,
      Body: message,
    }).toString(),
  })

  const result = await twilioRes.json()

  if (!twilioRes.ok) {
    console.error('Twilio error:', result)
    return new Response(JSON.stringify({ error: 'SMS delivery failed', detail: result }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  console.log('SMS sent to', normalized, '— SID:', result.sid)

  return new Response(JSON.stringify({ ok: true, sid: result.sid }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
