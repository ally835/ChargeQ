import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isValidEmail } from '@/utils'
import { useToast } from '@/store/appStore'

interface SiteManagerRegisterFormProps {
  onBack: () => void
  onSubmitted: () => void
}

// Available ChargeQ sites a manager can request access to
const AVAILABLE_SITES = [
  'Westfield Sydney',
  'Westfield Bondi Junction',
  'IKEA Tempe',
  'Chatswood Chase',
  'Stockland Merrylands',
  'Westfield Parramatta',
  'Other (specify in notes)',
]

function Field({
  label, required, children, error,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  error?: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 500,
        color: 'var(--teal)', letterSpacing: '0.06em',
        textTransform: 'uppercase', marginBottom: 6,
      }}>
        {label} {required && <span style={{ color: 'var(--r)' }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 11, color: '#F7C1C1', marginTop: 4 }}>{error}</div>
      )}
    </div>
  )
}

export function SiteManagerRegisterForm({ onBack, onSubmitted }: SiteManagerRegisterFormProps) {
  const toast = useToast()

  const [form, setForm] = useState({
    name: '', email: '', mobile: '',
    jobTitle: '', company: '', abn: '', notes: '',
  })
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 46, padding: '0 14px',
    background: 'var(--bg3)',
    border: '0.5px solid rgba(29,158,117,0.25)',
    borderRadius: 'var(--rads)', color: 'var(--cream)',
    fontFamily: '"DM Sans", sans-serif', fontSize: 14,
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    WebkitAppearance: 'none',
  }

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  function toggleSite(site: string) {
    setSelectedSites((prev) =>
      prev.includes(site) ? prev.filter((s) => s !== site) : [...prev, site]
    )
    setErrors((e) => ({ ...e, sites: '' }))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Please enter your full name'
    if (!isValidEmail(form.email)) e.email = 'Please enter a valid email address'
    if (!form.mobile.trim()) e.mobile = 'Please enter your mobile number'
    if (!form.jobTitle.trim()) e.jobTitle = 'Please enter your job title'
    if (!form.company.trim()) e.company = 'Please enter your company name'
    if (selectedSites.length === 0) e.sites = 'Please select at least one site'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)

    // Direct insert — RPC register_with_provisional_pin requires a provisional PIN
    // which ChargeQ distributes separately. For self-service registration we
    // insert directly with status='pending' so SA can review.
    const { error } = await supabase.from('site_managers').insert({
      name:      form.name.trim(),
      email:     form.email.trim().toLowerCase(),
      mobile:    form.mobile.trim(),
      job_title: form.jobTitle.trim(),
      company:   form.company.trim(),
      abn:       form.abn.trim() || null,
      sites:     selectedSites,
      status:    'pending',
    })

    setLoading(false)

    if (error) {
      if (error.code === '23505') {
        setErrors({ email: 'An account with this email already exists. Try logging in instead.' })
      } else {
        console.error('Registration error:', error)
        toast('Could not submit request. Please try again.')
      }
      return
    }

    // Show submitted state for 1.2s then go to confirmation
    setSubmitted(true)
    window.setTimeout(() => {
      onSubmitted()
    }, 1200)
  }

  function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.target.style.borderColor = 'var(--g)'
    e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.1)'
  }

  function blurStyle(field: string) {
    return (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.target.style.borderColor = errors[field] ? 'var(--r)' : 'rgba(29,158,117,0.25)'
      e.target.style.boxShadow = ''
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1500,
      background: 'var(--bg)', overflowY: 'auto',
    }}>
      {/* Grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(29,158,117,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(29,158,117,0.04) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto', padding: '20px 20px 40px' }}>

        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'var(--mint)',
            fontSize: 13, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
            marginBottom: 20, padding: 0,
          }}
        >
          ← Back to login
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, background: 'var(--g)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 0 32px rgba(29,158,117,0.3)',
          }}>
            <span style={{ fontSize: 26 }}>🏢</span>
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--cream)', marginBottom: 6 }}>
            Request site manager access
          </div>
          <div style={{ fontSize: 13, color: 'var(--mint)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
            Complete this form and ChargeQ will review your request within 1 business day.
          </div>
        </div>

        {/* Form */}
        <div style={{
          background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)',
          borderRadius: 'var(--rad)', padding: 20, marginBottom: 14,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.3), transparent)' }} />
          <div className="section-label">Personal details</div>

          <Field label="Full name" required error={errors.name}>
            <input
              type="text" placeholder="e.g. Sarah Mitchell" autoComplete="name"
              value={form.name} onChange={(e) => set('name', e.target.value)}
              style={{ ...inputStyle, borderColor: errors.name ? 'var(--r)' : undefined }}
              onFocus={focusStyle} onBlur={blurStyle('name')}
            />
          </Field>

          <Field label="Work email" required error={errors.email}>
            <input
              type="email" placeholder="you@company.com.au" autoComplete="email"
              value={form.email} onChange={(e) => set('email', e.target.value)}
              style={{ ...inputStyle, borderColor: errors.email ? 'var(--r)' : undefined }}
              onFocus={focusStyle} onBlur={blurStyle('email')}
            />
          </Field>

          <Field label="Mobile number" required error={errors.mobile}>
            <input
              type="tel" placeholder="04XX XXX XXX" autoComplete="tel"
              value={form.mobile} onChange={(e) => set('mobile', e.target.value)}
              style={{ ...inputStyle, borderColor: errors.mobile ? 'var(--r)' : undefined }}
              onFocus={focusStyle} onBlur={blurStyle('mobile')}
            />
          </Field>
        </div>

        <div style={{
          background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)',
          borderRadius: 'var(--rad)', padding: 20, marginBottom: 14,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.3), transparent)' }} />
          <div className="section-label">Organisation details</div>

          <Field label="Job title" required error={errors.jobTitle}>
            <input
              type="text" placeholder="e.g. Operations Manager, Facilities Director"
              value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)}
              style={{ ...inputStyle, borderColor: errors.jobTitle ? 'var(--r)' : undefined }}
              onFocus={focusStyle} onBlur={blurStyle('jobTitle')}
            />
          </Field>

          <Field label="Company / Organisation" required error={errors.company}>
            <input
              type="text" placeholder="e.g. Westfield Corporation Pty Ltd"
              value={form.company} onChange={(e) => set('company', e.target.value)}
              style={{ ...inputStyle, borderColor: errors.company ? 'var(--r)' : undefined }}
              onFocus={focusStyle} onBlur={blurStyle('company')}
            />
          </Field>

          <Field label="ABN" error={errors.abn}>
            <input
              type="text" placeholder="e.g. 12 345 678 901 (optional)"
              value={form.abn} onChange={(e) => set('abn', e.target.value)}
              style={inputStyle}
              onFocus={focusStyle} onBlur={blurStyle('abn')}
            />
          </Field>
        </div>

        <div style={{
          background: 'var(--surf)', border: '0.5px solid rgba(29,158,117,0.18)',
          borderRadius: 'var(--rad)', padding: 20, marginBottom: 14,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,158,117,0.3), transparent)' }} />
          <div className="section-label">Sites requested</div>
          <p style={{ fontSize: 12, color: 'var(--mint)', marginBottom: 12, lineHeight: 1.5 }}>
            Which sites will you be managing? Select all that apply.
          </p>

          {errors.sites && (
            <div style={{ fontSize: 11, color: '#F7C1C1', marginBottom: 8 }}>{errors.sites}</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {AVAILABLE_SITES.map((site) => {
              const selected = selectedSites.includes(site)
              return (
                <button
                  key={site}
                  onClick={() => toggleSite(site)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px',
                    background: selected ? 'var(--gl)' : 'var(--bg3)',
                    border: `1.5px solid ${selected ? 'var(--g)' : 'rgba(29,158,117,0.2)'}`,
                    borderRadius: 'var(--rads)', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 6,
                    border: `2px solid ${selected ? 'var(--g)' : 'rgba(29,158,117,0.3)'}`,
                    background: selected ? 'var(--g)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.15s',
                  }}>
                    {selected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: selected ? 'var(--teal)' : 'var(--cream)' }}>
                    {site}
                  </span>
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--teal)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              Additional notes <span style={{ color: 'var(--text3)', textTransform: 'none', fontSize: 11 }}>(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Anything else ChargeQ should know about your site or setup..."
              style={{
                width: '100%', height: 80,
                background: 'var(--bg3)', border: '0.5px solid rgba(29,158,117,0.25)',
                borderRadius: 'var(--rads)', color: 'var(--cream)',
                fontFamily: '"DM Sans", sans-serif', fontSize: 13,
                padding: '10px 14px', resize: 'none', outline: 'none', lineHeight: 1.5,
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,158,117,0.1)' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(29,158,117,0.25)'; e.target.style.boxShadow = '' }}
            />
          </div>
        </div>

        {/* Privacy note */}
        <div style={{
          background: 'rgba(29,158,117,0.06)', border: '0.5px solid rgba(29,158,117,0.18)',
          borderRadius: 'var(--rads)', padding: '10px 14px',
          fontSize: 11, color: 'var(--mint)', lineHeight: 1.6, marginBottom: 20,
        }}>
          🔒 Your details are stored securely and only used to verify your identity and manage your site access. ChargeQ will contact you within 1 business day.
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || submitted}
          style={{
            width: '100%', height: 56,
            background: submitted ? '#2a7d5f' : loading ? 'var(--gm)' : 'var(--g)',
            color: '#fff', border: 'none', borderRadius: 14,
            fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800,
            cursor: submitted || loading ? 'default' : 'pointer',
            transition: 'all 0.4s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: submitted ? '0 4px 20px rgba(29,158,117,0.5)' : '0 4px 20px rgba(29,158,117,0.3)',
            transform: submitted ? 'scale(0.98)' : 'scale(1)',
          }}
        >
          {submitted ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Request submitted!
            </>
          ) : loading ? (
            <><span className="cq-spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff' }} /> Submitting...</>
          ) : (
            'Submit access request →'
          )}
        </button>
      </div>
    </div>
  )
}
