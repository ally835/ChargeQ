// supabase/functions/ocm-proxy/index.ts
// Deployed via: supabase functions deploy ocm-proxy
// Secret set via: supabase secrets set OCM_API_KEY=your_key_here
//
// This Edge Function proxies Open Charge Map API requests server-side
// so the OCM API key is NEVER exposed in client-side JavaScript.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const url = new URL(req.url)
    const lat     = url.searchParams.get('lat') ?? '-33.8688'
    const lng     = url.searchParams.get('lng') ?? '151.2093'
    const radius  = url.searchParams.get('radius') ?? '15'
    const maxResults = url.searchParams.get('maxResults') ?? '100'

    const OCM_KEY = Deno.env.get('OCM_API_KEY')
    if (!OCM_KEY) {
      return new Response(JSON.stringify({ error: 'OCM_API_KEY not configured' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const ocmUrl = new URL('https://api.openchargemap.io/v3/poi/')
    ocmUrl.searchParams.set('output', 'json')
    ocmUrl.searchParams.set('latitude', lat)
    ocmUrl.searchParams.set('longitude', lng)
    ocmUrl.searchParams.set('distance', radius)
    ocmUrl.searchParams.set('distanceunit', 'KM')
    ocmUrl.searchParams.set('maxresults', maxResults)
    ocmUrl.searchParams.set('compact', 'true')
    ocmUrl.searchParams.set('verbose', 'false')
    ocmUrl.searchParams.set('countrycode', 'AU')
    ocmUrl.searchParams.set('key', OCM_KEY)

    const ocmRes = await fetch(ocmUrl.toString(), {
      headers: { 'User-Agent': 'ChargeQ/2.6 (hello@chargeq.com.au)' },
    })

    if (!ocmRes.ok) {
      const text = await ocmRes.text()
      return new Response(JSON.stringify({ error: `OCM error ${ocmRes.status}`, detail: text }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const data = await ocmRes.json()

    return new Response(JSON.stringify(data), {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        // Cache for 5 minutes — OCM data doesn't change second-by-second
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
