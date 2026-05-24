// supabase/functions/notify-new-manager/index.ts
//
// Triggered by a Supabase Database Webhook on INSERT to site_managers table.
// Sends an email to founder@chargeq.com.au via Resend (https://resend.com).
//
// Setup:
//   1. Sign up at resend.com (free tier sends 100 emails/day)
//   2. supabase secrets set RESEND_API_KEY=re_your_key_here
//   3. supabase functions deploy notify-new-manager
//   4. In Supabase Dashboard → Database → Webhooks → Create webhook:
//        Table: site_managers
//        Events: INSERT
//        URL: https://YOUR_PROJECT.supabase.co/functions/v1/notify-new-manager
//        HTTP method: POST
//        HTTP headers: Authorization: Bearer YOUR_ANON_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FOUNDER_EMAIL = 'founder@chargeq.com.au'
const FROM_EMAIL    = 'noreply@chargeq.com.au'  // Must be a verified Resend domain

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_KEY) {
      console.error('RESEND_API_KEY not set')
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Supabase webhook sends { type, table, record, old_record, schema }
    const payload = await req.json()
    const record = payload.record

    if (!record) {
      return new Response(JSON.stringify({ error: 'No record in payload' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const {
      name       = 'Unknown',
      email      = '—',
      mobile     = '—',
      job_title  = '—',
      company    = '—',
      abn        = '—',
      sites      = [],
      created_at = new Date().toISOString(),
    } = record

    const sitesText = Array.isArray(sites) && sites.length > 0
      ? sites.join(', ')
      : 'None specified'

    const submittedAt = new Date(created_at).toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .card { background: #fff; border-radius: 12px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: #1D9E75; padding: 28px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px; }
    .body { padding: 28px 32px; }
    .badge { display: inline-block; background: #FFF3CD; color: #856404; border: 1px solid #FFEAA7; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
    .field { margin-bottom: 14px; }
    .label { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
    .value { font-size: 14px; color: #111; }
    .divider { border: none; border-top: 1px solid #eee; margin: 20px 0; }
    .action { background: #1D9E75; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block; margin-top: 8px; }
    .footer { padding: 16px 32px; background: #f9f9f9; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>⚡ ChargeQ</h1>
      <p>New site manager access request</p>
    </div>
    <div class="body">
      <div class="badge">⏳ Pending approval</div>
      <div class="field">
        <div class="label">Full name</div>
        <div class="value">${name}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value">${email}</div>
      </div>
      <div class="field">
        <div class="label">Mobile</div>
        <div class="value">${mobile}</div>
      </div>
      <hr class="divider">
      <div class="field">
        <div class="label">Job title</div>
        <div class="value">${job_title}</div>
      </div>
      <div class="field">
        <div class="label">Company</div>
        <div class="value">${company}</div>
      </div>
      <div class="field">
        <div class="label">ABN</div>
        <div class="value">${abn}</div>
      </div>
      <hr class="divider">
      <div class="field">
        <div class="label">Sites requested</div>
        <div class="value">${sitesText}</div>
      </div>
      <div class="field">
        <div class="label">Submitted</div>
        <div class="value">${submittedAt} AEST</div>
      </div>
      <hr class="divider">
      <p style="font-size: 14px; color: #444; line-height: 1.6;">
        Log in to the ChargeQ admin panel to review this request, approve the manager, and set their initial PIN.
      </p>
      <a href="https://app.chargeq.com.au" class="action">Open ChargeQ Admin →</a>
    </div>
    <div class="footer">
      This email was sent automatically by ChargeQ. Do not reply to this email.
    </div>
  </div>
</body>
</html>`

    const emailText = `
New ChargeQ Site Manager Request

Name:     ${name}
Email:    ${email}
Mobile:   ${mobile}
Title:    ${job_title}
Company:  ${company}
ABN:      ${abn}
Sites:    ${sitesText}
Submitted: ${submittedAt} AEST

Log in to the ChargeQ admin panel to approve this request.
`.trim()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    `ChargeQ <${FROM_EMAIL}>`,
        to:      [FOUNDER_EMAIL],
        subject: `⏳ New site manager request — ${name} (${company})`,
        html:    emailHtml,
        text:    emailText,
      }),
    })

    const resBody = await res.json()

    if (!res.ok) {
      console.error('Resend error:', resBody)
      return new Response(JSON.stringify({ error: 'Email send failed', detail: resBody }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    console.log('Notification sent to', FOUNDER_EMAIL, 'for manager request from', email)

    return new Response(JSON.stringify({ ok: true, emailId: resBody.id }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
